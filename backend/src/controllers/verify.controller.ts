import { Request, Response, NextFunction } from "express";
import { verifyAsset } from "../services/verify.service.js";
import { success, fail } from "../utils/response.js";

export async function verify(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id);
    const { filePath, metadataPath } = req.body;
    if (!filePath) return fail(res, "缺少 filePath", 400);
    const result = await verifyAsset(id, filePath, metadataPath);
    return success(res, result);
  } catch (err) {
    next(err);
  }
}
