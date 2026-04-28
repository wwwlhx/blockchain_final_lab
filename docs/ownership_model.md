# 三层结构化数字资产确权模型说明

## 1. 模型升级背景

原始原型只把 `fileHash` 写入链上，链上字段主要是：

- `assetId`
- `fileHash`
- `owner`
- `timestamp`

这种方式能证明“某个文件哈希在某个时间被某个地址登记过”，但更像**文件哈希存证**，还不足以完整体现“数字资产确权”。

原因是它还缺少两类关键信息：

- 对资产声明本身的稳定描述
- 对权属关系与资产状态的结构化表达

因此，当前版本将模型升级为三层结构化确权模型。

## 2. 三层模型概览

### 第一层：文件内容指纹层

这一层负责描述文件内容本身。

系统对真实文件计算 `SHA-256`，得到：

- `fileHash`

它的作用是：

- 证明文件内容是否发生变化
- 为数字资产提供内容层面的唯一指纹

如果文件内容发生修改，即使只改动一个字符，重新计算出的 `fileHash` 也会变化。

### 第二层：资产元数据声明层

这一层负责描述这份文件在业务语义上被登记成什么资产。

系统在链下生成标准化 `metadata JSON`，当前字段包括：

- `metadataStandard`
- `metadataVersion`
- `assetName`
- `description`
- `assetCategory`
- `originalFileName`
- `fileExtension`
- `fileSize`
- `fileHash`
- `hashAlgorithm`
- `rightsType`
- `claimantAddress`
- `createdAtLocal`

然后对 canonical JSON 计算：

- `metadataHash`

并保存：

- `metadataURI`

其中：

- `metadataHash` 用于证明资产声明是否被修改
- `metadataURI` 用于定位链下的声明文件

当前阶段 `metadataURI` 指向本地 `metadata/*.json` 文件，后续可以扩展为 IPFS CID。

### 第三层：链上权属记录层

这一层负责描述权属关系与资产状态。

链上结构体当前包括：

- `assetId`
- `fileHash`
- `metadataHash`
- `metadataURI`
- `rightsType`
- `creator`
- `owner`
- `registeredAt`
- `status`

其中：

- `creator` 表示最初登记人
- `owner` 表示当前所有者
- `status` 当前支持 `Active / Revoked`

这让链上记录从“静态存证”升级为“可查询、可流转、可撤销的结构化确权记录”。

## 3. 链上与链下的职责划分

### 链上负责

- 保存不可篡改的确权记录
- 保存内容指纹 `fileHash`
- 保存声明指纹 `metadataHash`
- 保存权利类型 `rightsType`
- 保存创建者、当前所有者和状态

### 链下负责

- 保存真实文件本体
- 保存 `metadata JSON`
- 生成人类可读的资产说明
- 执行本地文件哈希与 metadata 哈希计算

这种设计的优点是：

- 链上数据更精简
- 文件不直接上链，成本更低
- 系统结构更适合后续扩展到 IPFS、数据库和前后端

## 4. 为什么 metadataHash 是确权升级的关键

如果只有 `fileHash`，系统只能回答：

**“内容是不是同一个？”**

但数字资产确权还必须回答：

**“它被声明成什么资产？拥有什么权利类型？登记说明是什么？”**

这就是 `metadataHash` 的价值。

通过引入 `metadataHash`，系统不仅验证文件本身，还能验证资产声明本身，从而避免以下问题：

- 文件没变，但资产描述被偷偷修改
- 权利类型被改写
- 原始声明内容发生变更却无法发现

因此，`metadataHash` 是从“哈希存证”走向“结构化确权”的关键一步。

## 4.1 权利类型规范化

为了提升确权语义的一致性，当前系统不再接受任意 `rightsType` 字符串，而是限定为以下受控集合：

- `original`
- `licensed`
- `assigned`
- `joint`

这意味着：

- 链上确权记录的权利语义更稳定
- 元数据声明更容易解释和比较
- 不同资产记录之间具有可比性

相比自由字符串方式，这是一种更接近正式确权建模的方法。

## 4.2 元数据标准化

为了避免 metadata 只是一份“随意组织的 JSON”，当前系统引入了 schema 级字段：

- `metadataStandard`
- `metadataVersion`

并新增：

- `assetCategory`
- `claimantAddress`

其中：

- `metadataStandard` 用于标识当前 metadata 所遵循的结构规范
- `metadataVersion` 用于后续版本演进
- `assetCategory` 用于让资产类别语义统一
- `claimantAddress` 用于把链下声明与链上登记地址绑定

这让资产元数据从“附带说明”升级为“标准化声明文档”。

## 5. 重复登记检测的确权意义

重复登记检测并不只是工程优化，它本身也是确权逻辑的一部分。

系统在登记前根据 `fileHash` 查询：

- 若返回 `0`，说明当前内容尚未登记
- 若返回非 `0`，说明该内容已经存在对应资产

这意味着：

- 同一内容只会对应一个链上 `assetId`
- 确权关系更稳定
- 可以避免重复创建多条相同内容的确权记录

因此，重复登记检测提升的是**确权唯一性**。

## 6. transferAsset 与 revokeAsset 的确权意义

### `transferAsset`

`transferAsset` 让系统具备最基本的权属流转能力。

它表达的是：

**这项资产的当前权属已经从旧 owner 变更为新 owner。**

这使系统不再只是“登记谁最初提交过”，而是能表示“当前谁拥有该资产”。

### `revokeAsset`

`revokeAsset` 让系统具备最基本的状态治理能力。

它表达的是：

**这条确权记录仍然存在，但该资产当前已被标记为失效或撤销。**

撤销后：

- 历史记录仍保留
- 文件和 metadata 仍可做历史一致性校验
- 但资产不能继续转移

这与真实业务中的“资产失效但链上历史可追溯”更接近。

## 6.1 资产历史可追溯

当前系统新增了资产历史追溯能力，能够基于链上事件回放资产生命周期。

历史来源包括：

- `AssetRegistered`
- `AssetTransferred`
- `AssetRevoked`

通过回放这些事件，可以获得：

- 何时创建资产
- 创建者是谁
- 当前 owner 是如何变化的
- 是否发生撤销

这使系统从“静态状态查询”进一步提升为“可追溯确权记录”。

## 7. 适合答辩时的简短表达

可以直接这样说：

“当前系统采用的是三层结构化数字资产确权模型。第一层是文件内容指纹层，用 `SHA-256` 的 `fileHash` 证明文件内容是否被修改；第二层是资产元数据声明层，通过标准化 `metadata JSON` 和 `metadataHash` 证明资产声明是否被修改；第三层是链上权属记录层，在链上保存 `creator`、`owner`、`rightsType`、`registeredAt` 和 `status` 等字段，用于表达资产的权属关系和有效状态。这样，系统就从单纯的文件哈希存证，升级成了更完整的结构化数字资产确权原型。” 
