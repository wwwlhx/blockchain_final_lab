# 数字资产确权系统 — 项目现状文档

> 生成时间：2025-05-22 | 供审核人员了解当前实现状态、技术架构和已知问题

---

## 一、项目概述

本项目是一个基于本地区块链的 **数字资产确权系统原型**，围绕"三层结构化确权模型"实现了文件上链登记、完整性校验、权属转移、撤销和历史追溯的完整闭环。

项目分为三个独立子模块：

| 模块 | 目录 | 技术栈 | 端口 |
|------|------|--------|------|
| 智能合约 + CLI | `contracts/` | Hardhat 3 + Solidity 0.8.28 + ethers v6 | 8545 |
| 后端 API | `backend/` | Express.js + TypeScript + Multer | 3001 |
| 前端 UI | `frontend/` | React 18 + Vite + TailwindCSS + Framer Motion | 5173 |

---

## 二、三层确权模型

```
┌──────────────────────────────────────────────────────────────────┐
│ Layer 1: 文件内容指纹层                                          │
│   SHA-256(文件二进制) → fileHash                                 │
│   任何 1 bit 修改都会导致哈希完全不同                              │
├──────────────────────────────────────────────────────────────────┤
│ Layer 2: 资产元数据声明层                                        │
│   规范化 JSON 元数据(名称/类别/权利类型/创建者...) → metadataHash  │
│   防止声明内容被篡改                                              │
├──────────────────────────────────────────────────────────────────┤
│ Layer 3: 链上权属记录层                                          │
│   assetId / fileHash / metadataHash / creator / owner / status  │
│   不可篡改地写入智能合约，支持事件回放                              │
└──────────────────────────────────────────────────────────────────┘
```

---

## 三、目录结构

```
blockchain_final_lab/
├── contracts/                    # 智能合约 + CLI 工具
│   ├── contracts/
│   │   └── AssetRegistry.sol     # 核心合约 (147行)
│   ├── utils/                    # TypeScript 工具库
│   │   ├── contract.ts           # 合约连接 (Hardhat network API)
│   │   ├── config.ts             # 部署配置加载
│   │   ├── hash.ts               # SHA-256 哈希计算
│   │   ├── metadata.ts           # 元数据生成/保存/加载
│   │   ├── fileMeta.ts           # 文件元信息读取
│   │   ├── standards.ts          # rightsType/assetCategory 规范化
│   │   ├── assetCommands.ts      # CLI 业务逻辑
│   │   ├── args.ts               # CLI 参数解析
│   │   └── cli.ts                # CLI 入口
│   ├── scripts/                  # Hardhat 脚本
│   │   ├── deploy.ts             # 合约部署
│   │   ├── register_file.ts      # 文件登记
│   │   ├── query_asset.ts        # 资产查询
│   │   ├── verify_asset.ts       # 资产校验
│   │   ├── transfer_asset.ts     # 权属转移
│   │   ├── revoke_asset.ts       # 资产撤销
│   │   ├── history_asset.ts      # 历史查询
│   │   └── run_tests.ts          # 集成测试
│   ├── test/                     # 测试文件
│   ├── hardhat.config.ts         # Hardhat 3 配置
│   └── package.json
├── backend/                      # Express API 服务
│   ├── src/
│   │   └── server.ts             # 全部 API 实现 (588行，单文件)
│   ├── uploads/                  # 上传文件暂存
│   └── package.json
├── frontend/                     # React 前端
│   ├── src/
│   │   ├── main.tsx              # 入口 + Toaster 配置
│   │   ├── App.tsx               # 路由定义
│   │   ├── index.css             # 全局样式 (TailwindCSS)
│   │   ├── components/
│   │   │   ├── Layout.tsx        # 侧边栏布局 + 链状态指示器
│   │   │   └── CopyButton.tsx    # 一键复制组件
│   │   ├── lib/
│   │   │   ├── api.ts            # Axios API 客户端 + 类型定义
│   │   │   └── utils.ts          # cn/truncateHash/truncateAddress 等工具
│   │   └── pages/
│   │       ├── Dashboard.tsx     # 仪表盘 (统计/快捷操作/三层模型图)
│   │       ├── Register.tsx      # 多步骤资产登记
│   │       ├── Query.tsx         # 资产查询 + 撤销
│   │       ├── Verify.tsx        # 文件完整性校验
│   │       ├── Transfer.tsx      # 权属转移
│   │       └── History.tsx       # 事件时间线
│   ├── vite.config.ts            # Vite 配置 + API 代理
│   └── package.json
├── STARTUP_GUIDE.md              # 启动指南
└── README.md                     # 原始 README (合约核心逻辑说明)
```

---

## 四、智能合约

### `AssetRegistry.sol` (Solidity 0.8.28)

**数据结构：**
```solidity
struct Asset {
    uint256 id;
    string  fileHash;       // SHA-256 文件指纹
    string  metadataHash;   // 元数据规范化哈希
    string  metadataURI;    // 元数据 JSON 存储路径
    string  rightsType;     // original | licensed | assigned | joint
    address creator;        // 原始创建者
    address owner;          // 当前所有者
    uint256 registeredAt;   // 登记时间戳
    AssetStatus status;     // Active | Revoked
}
```

**合约函数：**

| 函数 | 类型 | 功能 |
|------|------|------|
| `registerAsset(fileHash, metadataHash, metadataURI, rightsType)` | write | 登记资产，内含 fileHash 去重 |
| `getAsset(assetId)` | view | 按 ID 查询资产 |
| `getAssetIdByFileHash(fileHash)` | view | 按 fileHash 反查 assetId |
| `transferAsset(assetId, newOwner)` | write | 仅 owner 可操作，已撤销资产不可转移 |
| `revokeAsset(assetId)` | write | creator 或 owner 可撤销 |

**事件：**
- `AssetRegistered` — 登记
- `AssetTransferred` — 转移
- `AssetRevoked` — 撤销

**权限控制：**
- 转移：仅当前 owner
- 撤销：creator 或 owner
- 登记：任何地址，但同一 fileHash 不可重复登记

---

## 五、后端 API

单文件实现 (`backend/src/server.ts`，588 行)，通过动态 import 加载 `contracts/dist/utils/` 下的编译产物。

### API 端点列表

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | `/api/health` | 健康检查 + 链状态（连接/地址/余额） |
| GET | `/api/deployment` | 部署配置信息 |
| POST | `/api/upload` | 上传文件 → 返回 filePath + fileHash |
| POST | `/api/assets/register` | 登记资产（全流程：哈希→元数据→上链） |
| GET | `/api/assets` | 列出所有资产（通过 queryFilter 遍历事件） |
| GET | `/api/assets/:id` | 查询单个资产详情 + 元数据 |
| POST | `/api/assets/:id/verify` | 校验文件哈希与链上是否一致 |
| POST | `/api/assets/:id/transfer` | 转移权属 |
| POST | `/api/assets/:id/revoke` | 撤销资产 |
| GET | `/api/assets/:id/history` | 资产生命周期事件时间线 |
| GET | `/api/accounts` | 列出 Hardhat 测试账户（前 5 个） |

### 后端优化机制

- **合约连接缓存** — `getContractUtils()` 和 `getContract()` 只初始化一次，后续复用
- **friendlyError()** — 将合约 revert 消息映射为中文提示
- **全局错误中间件** — 统一 `{ success: false, error: "..." }` 格式
- **启动预热** — 服务启动时即缓存合约连接

### 重要注意事项

- 后端必须以 `contracts/` 为 cwd 启动（因为 `connectToAssetRegistry()` 内部依赖 `import { network } from "hardhat"`，Hardhat 需要在 cwd 中找到 `hardhat.config.ts`）
- 启动命令：`cd contracts && npx tsx watch ../backend/src/server.ts`
- 动态 import 路径已用 `pathToFileURL()` 转换，兼容 Windows ESM

---

## 六、前端 UI

### 页面一览

| 页面 | 路由 | 核心交互 |
|------|------|----------|
| 仪表盘 | `/` | 统计卡片（动画计数器）、快捷操作、三层模型可视化、最近资产列表 |
| 资产登记 | `/register` | 4 步骤流程：拖拽上传 → 填写元数据 → 确认 → 上链处理/成功 |
| 资产查询 | `/query` `/query/:id` | 列表/详情双视图，含撤销按钮、CopyButton、跳转校验/转移/历史 |
| 资产校验 | `/verify/:id?` | 拖拽上传待校验文件，对比链上/本地哈希，动画显示校验结果 |
| 权属转移 | `/transfer/:id?` | 选择新 owner（测试账户快选），From→To 可视化预览 |
| 历史追溯 | `/history/:id` | 时间线 UI，事件按类型着色，交易哈希可复制 |

### UI 特性

- **Toast 通知** — `react-hot-toast`，所有关键操作有即时反馈
- **CopyButton** — 哈希/地址一键复制，贯穿所有页面
- **链状态指示器** — 侧边栏底部实时显示连接状态、账户、余额（15s 轮询）
- **动画** — Framer Motion 页面切换、侧边栏 active 指示条、统计数字滚动、三层模型悬浮效果
- **深色主题** — Tokyo Night 色系，glass 毛玻璃效果，自定义滚动条

### 前端依赖

```
react 18 / react-router-dom 6 / axios / framer-motion 11
lucide-react (图标) / clsx + tailwind-merge (样式合并)
react-hot-toast (通知) / tailwindcss 3 / vite 5
```

---

## 七、启动流程

```bash
# 终端 1 — 本地链
cd contracts && npx hardhat node

# 终端 2 — 部署合约
cd contracts && npx hardhat run scripts/deploy.ts --network localhost

# 终端 3 — 后端 API (必须从 contracts 目录启动)
cd contracts && npx tsx watch ../backend/src/server.ts

# 终端 4 — 前端
cd frontend && npm run dev
```

访问 `http://localhost:5173`

---

## 八、已知问题和待优化项

### 架构层面

| # | 问题 | 严重程度 | 说明 |
|---|------|----------|------|
| 1 | **后端单文件 588 行** | 中 | `server.ts` 包含所有路由和业务逻辑，未拆分为 routes/controllers/services |
| 2 | **后端必须从 contracts 目录启动** | 中 | 因为 `connectToAssetRegistry()` 依赖 Hardhat 的 `network` API，需要 cwd 包含 `hardhat.config.ts`。应考虑解耦，用纯 ethers.js + ABI 直连 |
| 3 | **无认证/鉴权** | 低 | 当前所有操作默认使用 Hardhat 第一个签名者，无用户身份区分。原型阶段可接受 |
| 4 | **元数据存储为本地文件** | 低 | `metadataURI` 指向本地 JSON 文件路径，未对接 IPFS 或其他去中心化存储 |
| 5 | **无数据库** | 低 | 资产列表通过 `queryFilter` 遍历链上事件获取，数据量大时会变慢 |

### 前端层面

| # | 问题 | 严重程度 | 说明 |
|---|------|----------|------|
| 6 | **无响应式布局** | 中 | 侧边栏固定 256px，移动端不可用 |
| 7 | **无加载骨架屏** | 低 | 数据加载时仅显示 spinner，无 skeleton 占位 |
| 8 | **Register 页面较长** | 低 | 466 行，可拆分为独立的 step 子组件 |
| 9 | **全局状态管理缺失** | 低 | 各页面独立 fetch，无共享状态缓存（如 React Query / Zustand） |

### 合约层面

| # | 问题 | 严重程度 | 说明 |
|---|------|----------|------|
| 10 | **无单元测试** | 中 | `test/` 目录存在但未见 Hardhat 标准测试，仅有 `run_tests.ts` 集成脚本 |
| 11 | **rightsType 用字符串比较** | 低 | 合约内用 `keccak256(bytes(rightsType))` 做校验，可改为 enum 节省 gas |
| 12 | **无访问控制合约** | 低 | 未使用 OpenZeppelin AccessControl，权限逻辑硬编码 |

---

## 九、核心数据流

```
用户上传文件
    │
    ▼
POST /api/upload
    │  计算 SHA-256 → fileHash
    │  读取文件元信息 (大小/扩展名)
    ▼
POST /api/assets/register
    │  生成标准化 metadata JSON
    │  计算 metadataHash = SHA-256(canonicalJSON)
    │  规范化 rightsType / assetCategory
    │  检查 fileHash 是否已登记
    │  调用 assetRegistry.registerAsset(fileHash, metadataHash, metadataURI, rightsType)
    │  解析 AssetRegistered 事件获取 assetId
    │  保存最终元数据文件
    ▼
链上存储: { id, fileHash, metadataHash, metadataURI, rightsType, creator, owner, registeredAt, status }
    │
    ├─→ GET /api/assets/:id        查询详情
    ├─→ POST /api/assets/:id/verify 本地文件哈希 vs 链上哈希
    ├─→ POST /api/assets/:id/transfer 变更 owner
    ├─→ POST /api/assets/:id/revoke   status → Revoked
    └─→ GET /api/assets/:id/history  聚合三类事件的时间线
```

---

## 十、技术栈版本汇总

| 技术 | 版本 |
|------|------|
| Node.js | v24+ |
| Hardhat | 3.4.0 |
| Solidity | 0.8.28 |
| ethers.js | 6.16.0 |
| TypeScript | ~5.8.0 |
| Express | 4.18.2 |
| React | 18.2.0 |
| Vite | 5.1.0 |
| TailwindCSS | 3.4.1 |
| Framer Motion | 11.0.0 |
