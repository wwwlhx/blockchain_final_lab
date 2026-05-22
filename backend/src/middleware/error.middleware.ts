import { Request, Response, NextFunction } from "express";
import { AppError, friendlyError } from "../utils/errors.js";

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  console.error("[API Error]", err.message);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  }

  // 合约 revert 等未知错误
  const status = (err as any).status || 500;
  return res.status(status).json({
    success: false,
    error: friendlyError(err.message || "服务器内部错误"),
    timestamp: new Date().toISOString(),
  });
}
