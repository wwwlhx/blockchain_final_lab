import { Request, Response, NextFunction } from "express";
import { processUploadedFile } from "../services/file.service.js";
import { success, fail } from "../utils/response.js";

export async function uploadFile(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      return fail(res, "未上传文件", 400);
    }
    const result = await processUploadedFile(req.file.path, req.file.originalname);
    return success(res, result);
  } catch (err) {
    next(err);
  }
}
