# 区块链数字资产确权与可信流转平台

一个面向课程设计与答辩演示的全栈数字资产确权系统。项目使用 SHA-256、标准化元数据和智能合约，建立“文件内容、资产声明、链上权属”三层可验证记录，并支持登记、查询、校验、转移、撤销和历史追溯。

> 项目提供的是技术证据链，而不是对法律意义上原创权或所有权的自动裁决。

## 核心亮点

### 1. 三层结构化确权模型

| 层级 | 核心数据 | 解决的问题 |
| --- | --- | --- |
| 文件内容指纹层 | `SHA-256(file)` | 文件内容是否发生变化 |
| 元数据声明层 | `SHA-256(canonical metadata JSON)` | 名称、类别、权利类型等声明是否变化 |
| 链上权属记录层 | `creator / owner / status / events` | 谁登记、当前归属谁、经历了哪些变化 |

只保存 `fileHash` 只能证明文件内容是否一致。本项目额外保存 `metadataHash`，因此还能校验登记时的资产声明。

### 2. 完整资产生命周期

```text
文件上传
  -> 哈希计算
  -> 元数据规范化
  -> 智能合约登记
  -> 文件与声明校验
  -> 权属转移
  -> 资产撤销
  -> 事件历史回放
```

### 3. 链上与链下协同

链上保存最小必要的不可篡改数据：

- 资产 ID
- 文件哈希与元数据哈希
- 元数据 URI
- 权利类型
- 创建者、当前所有者
- 登记时间与资产状态

SQLite 保存查询和展示需要的链下索引：

- 资产与元数据详情
- 交易记录
- 校验记录
- 系统操作日志

Hardhat 合约重新部署时，后端会根据部署身份自动重置旧的链下索引，避免演示数据与当前链状态不一致。

## 系统架构

```text
React + TypeScript
        |
        | REST API
        v
Express + TypeScript -------- SQLite
        |
        | ethers.js + JSON-RPC
        v
AssetRegistry.sol -------- Hardhat Local Node
```

| 模块 | 技术 | 默认端口 |
| --- | --- | --- |
| 前端 | React 18、Vite、TailwindCSS、Framer Motion | 5173 |
| 后端 | Express、TypeScript、better-sqlite3 | 3001 |
| 区块链 | Solidity 0.8.28、Hardhat 3、ethers.js 6 | 8545 |

## 已实现功能

- 多步骤文件登记与 SHA-256 计算
- canonical metadata JSON 与 `metadataHash`
- 同一文件内容重复登记拦截
- 资产详情与链上状态查询
- 原文件校验与篡改文件识别
- 仅 owner 可执行权属转移
- creator 或 owner 可撤销资产
- 已撤销资产禁止继续转移
- 登记、转移、撤销事件时间线
- SQLite 链下索引、统计和操作日志
- MetaMask 连接、账户展示和本地网络检测
- 系统架构可视化页面
- 合约、哈希工具与关键流程测试

## 钱包边界

当前 MetaMask 用于连接状态、地址和网络展示。登记、转移、撤销交易仍由后端连接的 Hardhat 默认测试账户签名。

生产化方向是将链上写操作改为用户钱包签名，后端只负责文件、元数据和链下索引。答辩时请勿将当前版本描述为“所有交易均由 MetaMask 用户签名”。

## 快速启动

环境建议：

- Node.js 22 或更高版本
- npm 10 或更高版本

首次运行分别安装依赖：

```powershell
cd contracts
npm install

cd ..\backend
npm install

cd ..\frontend
npm install
```

按以下顺序启动。

### 1. 启动本地区块链

```powershell
cd contracts
npm run compile
npm run node
```

### 2. 部署智能合约

新开终端：

```powershell
cd contracts
npm run deploy:localhost
```

部署结果会保存到 `contracts/deployments/localhost.json`。

### 3. 启动后端

```powershell
cd backend
npm run dev
```

健康检查：

```text
http://localhost:3001/api/health
```

### 4. 启动前端

```powershell
cd frontend
npm run dev
```

访问：

```text
http://localhost:5173
```

## 演示流程

推荐使用：

- 原文件：`demo_files/sample_asset.txt`
- 篡改文件：`demo_files/tampered_asset.txt`

1. 在仪表盘确认区块链为已连接状态。
2. 登记 `sample_asset.txt`，记录资产 ID、交易哈希和区块号。
3. 查询资产，展示 `fileHash`、`metadataHash`、creator 和 owner。
4. 使用 `sample_asset.txt` 校验，展示“校验通过”。
5. 使用 `tampered_asset.txt` 校验，展示“校验失败”。
6. 将资产转移给另一个 Hardhat 测试账户。
7. 展示登记与转移事件时间线。
8. 撤销资产，并说明撤销后不能继续转移。

完整答辩话术见 [docs/demo-script.md](docs/demo-script.md)。

## 测试

```powershell
cd contracts
npm test
```

测试覆盖：

- 正常登记和字段校验
- 非法权利类型
- 重复文件哈希
- 资产查询与哈希反查
- owner 转移和非 owner 拒绝
- creator/owner 撤销
- 已撤销资产禁止转移
- 三类链上事件
- canonical metadata 稳定性
- 文件和元数据篡改检测
- 登记、查询、校验关键流程

构建检查：

```powershell
cd backend
npm run build

cd ..\frontend
npm run build
```

## 目录结构

```text
blockchain_final_lab/
├─ contracts/          智能合约、部署脚本、CLI 和测试
├─ backend/            Express API、业务服务和 SQLite
├─ frontend/           React 可视化界面
├─ demo_files/         答辩演示文件
├─ docs/               演示脚本与答辩材料
└─ STARTUP_GUIDE.md    快速启动说明
```

## 项目边界

当前版本是课程项目原型，不是商业级版权司法认定系统。

- 本地 Hardhat 节点重启后链上状态会重置
- 元数据目前存储在本地文件，可扩展为 IPFS
- MetaMask 尚未承担链上写操作签名
- 未实现登录、司法审核和复杂角色权限
- SQLite 适用于本地演示，不用于多节点生产部署

这些限制不影响项目展示的核心结论：系统能够建立可验证、可追溯、难以单方篡改的数字资产技术证据链。
