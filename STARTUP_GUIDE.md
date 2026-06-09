# 数字资产确权系统 - 完整启动指南

## 系统架构

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│   Backend API   │────▶│  Blockchain     │
│   (React)       │     │   (Express)     │     │  (Hardhat)      │
│   Port: 5173    │     │   Port: 3001    │     │  Port: 8545     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## 快速启动（4个终端）

### 终端 1: 启动本地区块链
```bash
cd contracts
npm install
npm run compile
npm run node
```
保持运行，看到 "Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/"

### 终端 2: 部署智能合约
```bash
cd contracts
npm run deploy:localhost
```
看到合约地址后即部署成功

### 终端 3: 启动后端 API
```bash
cd backend
npm install
npm run dev
```
看到 "🚀 Asset Registry API running on http://localhost:3001"

### 终端 4: 启动前端
```bash
cd frontend
npm install
npm run dev
```
看到 "Local: http://localhost:5173/"

## 访问系统

打开浏览器访问: **http://localhost:5173**

后端健康检查: **http://localhost:3001/api/health**

> 每次重新启动 Hardhat 本地链后都需要重新部署合约。后端检测到新的部署身份时，会自动重置上一轮演示的 SQLite 链下索引。

## 功能页面

| 页面 | 路径 | 功能 |
|------|------|------|
| 仪表盘 | `/` | 系统概览、快速操作入口 |
| 资产登记 | `/register` | 上传文件并登记到区块链 |
| 资产查询 | `/query` | 查询链上资产详情 |
| 资产校验 | `/verify` | 验证文件完整性 |
| 权属转移 | `/transfer` | 转移资产所有权 |
| 历史追溯 | `/history/:id` | 查看资产生命周期 |

## 演示流程

### 1. 登记资产
- 进入"资产登记"页面
- 拖拽或选择文件（如 `demo_files/sample_asset.txt`）
- 填写资产名称、描述、权利类型
- 点击"确认登记到区块链"
- 等待交易确认，获得资产 ID

### 2. 查询资产
- 进入"资产查询"页面
- 输入资产 ID 或从列表选择
- 查看完整确权记录（哈希、创建者、所有者、状态等）

### 3. 校验资产
- 进入"资产校验"页面
- 输入资产 ID
- 上传原始文件
- 系统对比本地哈希与链上哈希
- 显示校验结果（通过/失败）

### 4. 篡改演示（亮点）
- 直接上传 `demo_files/tampered_asset.txt`
- 重新校验
- 显示"校验失败" → 证明防篡改能力

### 5. 权属转移
- 进入"权属转移"页面
- 选择资产 ID
- 选择新所有者地址（测试账户）
- 确认转移

### 6. 历史追溯
- 进入资产历史页面
- 查看完整时间线：登记 → 转移 → 撤销

## 常见问题

### Q: 后端报错 "Cannot find module..."
```bash
cd contracts
npm run build:ts  # 先编译 contracts 的 TypeScript
```

当前后端已通过 ethers.js + ABI 直接连接节点，可以在 `backend/` 目录独立启动，不再依赖 Hardhat 运行目录。

### Q: 前端显示 "加载失败"
确保：
1. 本地链正在运行（终端1）
2. 合约已部署（终端2）
3. 后端 API 正在运行（终端3）

### Q: 重新部署后数据丢失
这是正常的。每次重启 `hardhat node` 会重置区块链状态。

## 技术栈

- **前端**: React 18 + Vite + TailwindCSS + Framer Motion
- **后端**: Express.js + TypeScript
- **区块链**: Hardhat 3 + Solidity 0.8.28 + ethers.js v6
- **动画**: Framer Motion（页面切换、交互反馈）
