import { Request, Response, NextFunction } from "express";
import * as dao from "../database/dao.js";
import { success } from "../utils/response.js";

export async function getStats(_req: Request, res: Response, next: NextFunction) {
  try {
    const stats = dao.getStats();
    return success(res, stats);
  } catch (err) {
    next(err);
  }
}
