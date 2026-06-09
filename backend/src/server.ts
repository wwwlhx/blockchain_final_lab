import fs from "fs/promises";
import app from "./app.js";
import { config } from "./config/index.js";
import { warmUp } from "./services/blockchain.service.js";
import { loadDeploymentConfig } from "./services/blockchain.service.js";
import { initDatabase } from "./database/db.js";
import { reconcileDeployment } from "./database/dao.js";

// 确保上传目录存在
await fs.mkdir(config.uploadDir, { recursive: true });

// 初始化数据库
initDatabase();

// 启动服务
app.listen(config.port, async () => {
  console.log(`🚀 Asset Registry API running on http://localhost:${config.port}`);
  try {
    await warmUp();
    console.log("✅ Contract connection cached successfully");
    const deployment = await loadDeploymentConfig();
    const deploymentKey = [
      deployment.network,
      deployment.contractAddress.toLowerCase(),
      deployment.deployedAt,
    ].join(":");
    const reset = reconcileDeployment(deploymentKey);
    if (reset) {
      console.log("✅ New deployment detected; local indexes were reset");
    }
  } catch (e: any) {
    console.warn(`⚠️  Contract pre-warm failed: ${e.message}`);
  }
});
