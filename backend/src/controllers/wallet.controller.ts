import { Request, Response, NextFunction } from "express";

import * as walletService from "../services/wallet.service.js";
import { success, fail } from "../utils/response.js";

export async function prepareRegistration(req: Request, res: Response, next: NextFunction) {
  try {
    const { filePath, assetName, description, rightsType, assetCategory, claimantAddress } = req.body;
    if (!filePath || !assetName || !claimantAddress) {
      return fail(res, "缺少 filePath、assetName 或 claimantAddress", 400);
    }
    return success(res, await walletService.prepareRegistration({
      filePath,
      assetName,
      description,
      rightsType,
      assetCategory,
      claimantAddress,
    }));
  } catch (err) {
    next(err);
  }
}

export async function confirmRegistration(req: Request, res: Response, next: NextFunction) {
  try {
    const { transactionHash, assetName, description, assetCategory } = req.body;
    if (!transactionHash || !assetName) return fail(res, "缺少交易哈希或资产名称", 400);
    return success(res, await walletService.confirmRegistration({
      transactionHash,
      assetName,
      description,
      assetCategory,
    }), 201);
  } catch (err) {
    next(err);
  }
}

export async function confirmAction(req: Request, res: Response, next: NextFunction) {
  try {
    const { transactionHash, expectedType } = req.body;
    if (!transactionHash || !["TRANSFERRED", "REVOKED"].includes(expectedType)) {
      return fail(res, "交易哈希或操作类型无效", 400);
    }
    return success(res, await walletService.confirmAction({ transactionHash, expectedType }));
  } catch (err) {
    next(err);
  }
}

export async function transaction(req: Request, res: Response, next: NextFunction) {
  try {
    return success(res, await walletService.getTransactionDetails(req.params.hash));
  } catch (err) {
    next(err);
  }
}

export async function sync(_req: Request, res: Response, next: NextFunction) {
  try {
    return success(res, await walletService.syncFromChain());
  } catch (err) {
    next(err);
  }
}
