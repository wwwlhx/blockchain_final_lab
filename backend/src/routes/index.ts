import { Router } from "express";
import chainRoutes from "./chain.routes.js";
import uploadRoutes from "./upload.routes.js";
import assetRoutes from "./asset.routes.js";
import verifyRoutes from "./verify.routes.js";
import statsRoutes from "./stats.routes.js";
import walletRoutes from "./wallet.routes.js";

const router = Router();

// 链状态 & 系统
router.use("/", chainRoutes);

// 文件上传
router.use("/upload", uploadRoutes);

// 资产 CRUD
router.use("/assets", assetRoutes);

// 校验（挂在 /assets/:id/verify，但独立路由文件）
router.use("/assets", verifyRoutes);

// 统计数据
router.use("/stats", statsRoutes);
router.use("/", walletRoutes);

export default router;
