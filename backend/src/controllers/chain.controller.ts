import { Request, Response, NextFunction } from "express";
import * as chainService from "../services/chain.service.js";
import { success } from "../utils/response.js";

export async function health(_req: Request, res: Response, _next: NextFunction) {
  try {
    const chain = await chainService.getHealthStatus();
    return res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      chain,
    });
  } catch (error: any) {
    return res.json({
      status: "degraded",
      timestamp: new Date().toISOString(),
      chain: { connected: false, error: error.message },
    });
  }
}

export async function deployment(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await chainService.getDeploymentInfo();
    return success(res, data);
  } catch (err) {
    next(err);
  }
}

export async function accounts(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await chainService.getAccounts();
    return success(res, data);
  } catch (err) {
    next(err);
  }
}
