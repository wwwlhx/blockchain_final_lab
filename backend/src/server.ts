import fs from "fs/promises";
import app from "./app.js";
import { config } from "./config/index.js";
import { warmUp } from "./services/blockchain.service.js";
import { initDatabase } from "./database/db.js";

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
  } catch (e: any) {
    console.warn(`⚠️  Contract pre-warm failed: ${e.message}`);
  }
});
