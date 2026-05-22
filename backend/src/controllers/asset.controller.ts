import { Request, Response, NextFunction } from "express";
import * as assetService from "../services/asset.service.js";
import { success, fail } from "../utils/response.js";
import { ValidationError } from "../utils/errors.js";
import { friendlyError } from "../utils/errors.js";

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { filePath, assetName, description, rightsType, assetCategory } = req.body;
    if (!filePath || !assetName) {
      return fail(res, "缺少必填字段: filePath, assetName", 400);
    }
    const result = await assetService.registerAsset({
      filePath,
      assetName,
      description,
      rightsType,
      assetCategory,
    });
    return success(res, result, 201);
  } catch (err: any) {
    if (err.statusCode) return fail(res, err.message, err.statusCode);
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id) || id < 1) throw new ValidationError("无效的资产 ID");
    const result = await assetService.getAssetById(id);
    return success(res, result);
  } catch (err) {
    next(err);
  }
}

export async function list(_req: Request, res: Response, next: NextFunction) {
  try {
    const result = await assetService.listAssets();
    return success(res, result.assets);
  } catch (err) {
    next(err);
  }
}

export async function transfer(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id);
    const { newOwner } = req.body;
    if (!newOwner) return fail(res, "缺少 newOwner 地址", 400);
    const result = await assetService.transferAsset(id, newOwner);
    return success(res, result);
  } catch (err: any) {
    return fail(res, friendlyError(err.message), 400);
  }
}

export async function revoke(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id);
    const result = await assetService.revokeAsset(id);
    return success(res, result);
  } catch (err: any) {
    return fail(res, friendlyError(err.message), 400);
  }
}

export async function history(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id);
    const result = await assetService.getAssetHistory(id);
    return success(res, result);
  } catch (err) {
    next(err);
  }
}
