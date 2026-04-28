# 数字资产确权系统原型

基于 Hardhat、Solidity 与 TypeScript 的课程项目原型。当前版本已经从“单一 `fileHash` 存证”升级为“**三层结构化数字资产确权模型**”，重点解决的不是页面展示，而是数字资产确权方法本身的完整性、严谨性与可验证性。

## 1. 项目定位

本项目当前不做前端页面、不做 Web API、不接数据库、不接真实 IPFS，也不扩展成完整 NFT 交易系统。当前阶段只聚焦于一个问题：

**如何围绕真实文件，建立一个更像“数字资产确权”而不只是“文件哈希存证”的核心原型。**

围绕这个目标，系统实现了以下核心闭环：

- 读取真实文件
- 计算文件内容 `SHA-256`
- 生成标准化资产元数据 `metadata JSON`
- 计算 `metadataHash`
- 规范化 `rightsType`
- 规范化 `assetCategory`
- 将 `fileHash + metadataHash + rightsType + creator/owner/status` 写入链上
- 根据 `assetId` 查询完整链上确权记录
- 根据链上事件回放资产生命周期历史
- 校验文件内容与元数据声明是否仍与链上记录一致
- 检测重复登记
- 支持资产转移与撤销

## 2. 三层结构化确权模型

当前模型分为三层：

### 2.1 文件内容指纹层

这一层负责回答：“**文件内容是否被改动过？**”

- 链下读取真实文件
- 使用 `SHA-256` 计算文件内容哈希 `fileHash`
- `fileHash` 作为文件内容指纹
- 一旦文件被修改，重新计算出的 `fileHash` 就会变化

这一层强调的是**内容完整性**。

### 2.2 资产元数据声明层

这一层负责回答：“**这份文件被登记成什么类型的数字资产，它的声明信息是什么？**”

系统会在链下生成标准化 `metadata JSON`，当前字段包括：

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

然后：

- 对 canonical JSON 计算 `metadataHash`
- 将 `metadataHash` 写入链上
- 同时保存 `metadataURI`

当前阶段的 `metadataURI` 指向本地 `metadata/*.json` 文件，后续可以无缝替换为 IPFS CID。

这一层强调的是**资产声明的稳定性与可校验性**。

### 2.3 链上权属记录层

这一层负责回答：“**谁最初登记了这份资产？当前权属属于谁？它现在是否仍然有效？**”

当前链上保存字段：

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
- `owner` 表示当前权属持有人
- `status` 表示资产状态，当前支持：
  - `Active`
  - `Revoked`

这一层强调的是**链上权属记录与状态管理**。

## 3. 为什么不把文件本体直接上链

这是答辩时很值得明确说明的一点。

当前系统采用“链上保存最小必要确权数据，链下处理真实文件和元数据”的设计，原因是：

- 文件本体通常体积更大，直接上链成本高、效率低
- 区块链更适合保存不可篡改的**摘要信息**，而不是大文件本身
- `fileHash` 足以证明文件内容是否一致
- `metadataHash` 足以证明资产声明是否一致
- 链下保留 `metadata JSON` 更便于后续扩展到 IPFS、数据库、前后端系统

因此，当前系统是典型的：

**链上最小确权记录 + 链下文件与声明文档管理**

## 4. 为什么要增加 metadataHash

如果只保存 `fileHash`，系统只能回答：

**“这个文件内容有没有变过？”**

但数字资产确权还需要回答：

**“这份文件在登记时被声明为什么资产、拥有什么权利类型、对应什么说明信息？”**

因此必须引入 `metadataHash`。

增加 `metadataHash` 之后，系统可以同时校验两件事：

- 文件内容是否被改动
- 资产声明是否被改动

这使当前原型从“单哈希存证”升级为“**内容指纹 + 声明指纹 + 链上权属记录**”的结构化确权模型。

## 5. 为什么要做重复登记检测

重复登记检测的意义是：

- 防止同一文件内容被反复登记，造成确权记录混乱
- 保证 `fileHash` 与链上 `assetId` 之间具有唯一映射
- 让“同一个内容是否已经确权过”可以被直接判断

当前实现方式：

- 登记前先根据 `fileHash` 调用 `getAssetIdByFileHash`
- 若返回非 `0`，说明该文件内容已经登记
- 系统直接拦截，不继续执行注册交易

这让链上记录更接近“唯一确权登记”，而不只是“可重复写入的哈希列表”。

## 6. transferAsset 和 revokeAsset 的意义

### `transferAsset`

表示数字资产当前权属发生变更。

当前规则：

- 只有当前 `owner` 能转移
- 新所有者地址不能是零地址
- 资产状态必须是 `Active`

这使原型具备了**最基础的权属流转能力**。

### `revokeAsset`

表示该资产被撤销或标记失效。

当前规则：

- 只有 `creator` 或 `owner` 可以撤销
- 撤销不会删除历史记录
- 撤销后 `status = Revoked`
- 撤销后不能再转移

这使原型具备了**最基础的资产状态治理能力**。

## 6.1 权利类型规范化与元数据标准化

为了让“确权”语义更严谨，当前版本新增了两项标准化约束。

### 权利类型规范化

当前系统不再接受任意 `rightsType` 字符串，而是限定为以下受控集合：

- `original`：原创确权
- `licensed`：授权使用
- `assigned`：权利受让
- `joint`：共同权属

这项约束同时在：

- 链下 CLI 参数层
- metadata 生成层
- 链上合约校验层

三处生效。这样可以避免“用户随意填写权利类型”带来的语义混乱。

### 元数据标准化

当前 metadata 已经从“仅包含基础文件信息”升级为带 schema 标识的标准化结构，新增字段包括：

- `metadataStandard`
- `metadataVersion`
- `assetCategory`
- `claimantAddress`

其中：

- `metadataStandard` 当前为 `zzsy-asset-metadata-v1`
- `metadataVersion` 当前为 `1.1`
- `assetCategory` 当前支持：
  - `document`
  - `image`
  - `audio`
  - `video`
  - `code`
  - `dataset`
  - `model`
  - `other`

这让 metadata 不再只是“描述文件”，而是更接近“资产声明文档”。

## 6.2 资产历史可追溯

当前系统新增了资产历史追溯能力：

- 从链上回放 `AssetRegistered`
- 回放 `AssetTransferred`
- 回放 `AssetRevoked`

并按区块顺序输出成资产历史时间线。

这意味着系统不仅能展示“当前状态”，还可以展示：

- 何时登记
- 谁最初登记
- 何时发生权属转移
- 何时被撤销

这对“确权”很重要，因为确权不只是记录当前 owner，还包括整个权属变化过程的可追溯性。

## 7. 当前项目目录结构

```text
zzsy/
├─ README.md
├─ backend/                              # 预留，当前为空
├─ frontend/                             # 预留，当前为空
├─ docs/
│  ├─ experiment_record_template.md      # 实验记录模板
│  └─ ownership_model.md                 # 三层结构化确权模型说明
├─ demo_files/
│  └─ sample_asset.txt                   # 演示文件
└─ contracts/
   ├─ contracts/
   │  └─ AssetRegistry.sol               # 结构化资产确权合约
   ├─ scripts/
   │  ├─ deploy.ts                       # 部署合约
   │  ├─ interact.ts                     # 简化交互演示脚本
   │  ├─ register_file.ts                # 结构化资产登记 CLI
   │  ├─ query_asset.ts                  # 链上确权记录查询 CLI
   │  ├─ verify_file.ts                  # 兼容旧命令，仅校验文件哈希
   │  ├─ verify_asset.ts                 # 同时校验文件哈希和 metadataHash
   │  ├─ transfer_asset.ts               # 权属转移 CLI
   │  ├─ revoke_asset.ts                 # 资产撤销 CLI
   │  └─ run_tests.ts                    # 测试总入口
   ├─ test/
   │  ├─ AssetRegistry.test.ts           # 合约断言
   │  ├─ metadata.test.ts                # metadata / fileHash 工具断言
   │  └─ flow.test.ts                    # register-query-verify 流程断言
   ├─ utils/
   │  ├─ args.ts                         # 命令行参数解析
   │  ├─ assetCommands.ts                # 结构化确权主流程
   │  ├─ cli.ts                          # 统一终端输出
   │  ├─ config.ts                       # 部署配置读写
   │  ├─ contract.ts                     # 合约连接
   │  ├─ fileMeta.ts                     # 文件元数据提取
   │  ├─ hash.ts                         # SHA-256 计算
   │  └─ metadata.ts                     # metadata 生成、哈希、保存
   ├─ metadata/                          # 本地 metadata JSON 存放目录
   ├─ deployments/                       # 本地部署地址配置
   ├─ hardhat.config.ts
   ├─ package.json
   └─ tsconfig.json
```

## 8. 技术栈

- Hardhat 3
- Solidity 0.8.28
- TypeScript
- ethers v6
- 本地 Hardhat 测试链 `localhost`

## 9. 已实现功能

当前已经完成：

- 升级版 `AssetRegistry.sol`
- 结构化 `registerAsset(...)`
- `getAsset(assetId)`
- `getAssetIdByFileHash(fileHash)`
- `transferAsset(assetId, newOwner)`
- `revokeAsset(assetId)`
- 真实文件读取
- 文件 `SHA-256` 计算
- 标准化 `metadata JSON` 生成
- `metadataHash` 计算
- 权利类型受限校验
- 资产类别受限校验
- metadata 本地文件保存
- 重复登记检测
- 链上完整确权记录查询
- 资产历史回放查询
- 文件内容指纹校验
- 元数据声明指纹校验
- 资产状态展示
- 转移与撤销 CLI
- 测试脚本

## 10. 环境准备

在 `D:\code\zzsy\contracts` 目录执行：

```powershell
cd D:\code\zzsy\contracts
npm install
```

如果你本地 Hardhat CLI 在当前 Node 版本下出现异常，优先使用较稳定的 Node LTS 环境。项目代码本身已兼容 TypeScript 构建输出与本地链演示流程。

## 11. 常用命令

在 `D:\code\zzsy\contracts` 目录执行：

```powershell
npm run compile
npm run node
npm run deploy:localhost
npm run register:file -- --file ..\demo_files\sample_asset.txt --name "示例数字资产" --desc "课程项目演示文件" --rights original --category document
npm run query:asset -- --asset-id 1
npm run history:asset -- --asset-id 1
npm run verify:file -- --asset-id 1 --file ..\demo_files\sample_asset.txt
npm run verify:asset -- --asset-id 1 --file ..\demo_files\sample_asset.txt --metadata .\metadata\asset-1.json
npm run transfer:asset -- --asset-id 1 --to 0x...
npm run revoke:asset -- --asset-id 1
npm test
```

说明：

- `verify:file` 是旧命令兼容入口，只校验文件内容哈希
- 推荐使用 `verify:asset`，同时校验 `fileHash + metadataHash`

## 12. 最小演示流程

### 步骤 1：启动本地链

终端 A：

```powershell
cd D:\code\zzsy\contracts
npm run node
```

### 步骤 2：部署升级后的合约

终端 B：

```powershell
cd D:\code\zzsy\contracts
npm run deploy:localhost
```

### 步骤 3：结构化登记真实文件

```powershell
npm run register:file -- --file ..\demo_files\sample_asset.txt --name "示例数字资产" --desc "课程项目演示文件" --rights original --category document
```

登记成功后记录：

- `assetId`
- `fileHash`
- `metadataHash`
- `creator`
- `owner`
- `registeredAt`
- `status`

### 步骤 4：查询完整链上确权记录

```powershell
npm run query:asset -- --asset-id 1
```

### 步骤 4.1：查询资产历史时间线

```powershell
npm run history:asset -- --asset-id 1
```

这一步会按链上事件顺序输出：

- 初次登记
- 权属转移
- 资产撤销

### 步骤 5：校验文件与元数据

```powershell
npm run verify:asset -- --asset-id 1 --file ..\demo_files\sample_asset.txt --metadata .\metadata\asset-1.json
```

### 步骤 6：再次登记同一文件，验证重复登记拦截

```powershell
npm run register:file -- --file ..\demo_files\sample_asset.txt --name "重复登记测试" --rights original
```

### 步骤 7：转移资产

```powershell
npm run transfer:asset -- --asset-id 1 --to 0x...
```

### 步骤 8：再次查询，确认 owner 已变化

```powershell
npm run query:asset -- --asset-id 1
```

### 步骤 9：撤销资产

```powershell
npm run revoke:asset -- --asset-id 1
```

### 步骤 10：再次查询，确认状态变为 Revoked

```powershell
npm run query:asset -- --asset-id 1
```

### 步骤 11：尝试再次转移，应失败

```powershell
npm run transfer:asset -- --asset-id 1 --to 0x...
```

## 13. 异常处理说明

当前已覆盖以下典型异常：

- 文件不存在
- 目标路径是文件夹
- 文件为空
- `name / rights` 为空
- metadata 文件不存在
- `metadataHash` 不一致
- `fileHash` 不一致
- 重复登记
- `assetId` 不存在
- 非 owner 转移资产
- 转移到零地址
- 已撤销资产不能转移
- 部署地址不存在或配置错误
- 本地链未启动

命令行会优先输出简洁的中文提示，而不是堆栈。

## 14. 链上与链下数据边界

### 链上保存

- `assetId`
- `fileHash`
- `metadataHash`
- `metadataURI`
- `rightsType`
- `creator`
- `owner`
- `registeredAt`
- `status`

### 链下保存

- 原始文件本体
- `metadata/*.json`
- 本地文件路径
- 展示性文件元数据
- 标准化 metadata schema
- 演示记录与实验记录

## 15. 测试覆盖

当前测试覆盖三类内容：

### 合约测试

- 结构化资产登记成功
- `fileHash / metadataHash / rightsType` 非空校验
- `rightsType` 受限集合校验
- 重复 `fileHash` 拦截
- `getAsset`
- `getAssetIdByFileHash`
- owner 转移成功
- 非 owner 转移失败
- creator / owner 撤销成功
- Revoked 资产不可再转移
- 查询不存在 `assetId` 失败
- 登记 / 转移 / 撤销事件历史可回放

### 链下工具测试

- canonical metadata JSON 稳定生成
- metadata 标准字段存在且稳定
- 相同 metadata 生成相同 `metadataHash`
- metadata 修改后 `metadataHash` 变化
- 文件修改后 `fileHash` 变化

### 流程测试

- `register -> query -> verify` 通过
- 修改文件后文件校验失败
- 修改 metadata 后 metadata 校验失败
- 重复登记同一文件被拦截

运行：

```powershell
cd D:\code\zzsy\contracts
npm test
```

## 16. 当前边界与后续扩展

当前阶段明确不做：

- 前端页面
- Web API
- 数据库
- 真实 IPFS 上传
- ERC721/NFT 全套实现
- 交易市场
- 复杂版税分润
- 审核系统

如果后续要扩展，可以按下面路线推进：

### 扩展到后端

把 `contracts/utils/assetCommands.ts` 拆成 service，再由 Express/NestJS 对外暴露：

- `POST /assets/register`
- `GET /assets/:id`
- `POST /assets/verify`
- `POST /assets/:id/transfer`
- `POST /assets/:id/revoke`

### 扩展到前端

前端只负责：

- 选择文件
- 填写资产名称、描述、权利类型
- 展示链上确权结果
- 展示校验结果与状态

核心确权逻辑仍然复用当前原型。
