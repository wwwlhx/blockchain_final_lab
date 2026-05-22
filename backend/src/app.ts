import express from "express";
import cors from "cors";
import routes from "./routes/index.js";
import { errorHandler } from "./middleware/error.middleware.js";

const app = express();

// 全局中间件
app.use(cors());
app.use(express.json());

// API 路由
app.use("/api", routes);

// 全局错误处理
app.use(errorHandler);

export default app;
