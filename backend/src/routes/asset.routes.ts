import { Router } from "express";
import * as assetCtrl from "../controllers/asset.controller.js";

const router = Router();

router.get("/", assetCtrl.list);
router.post("/register", assetCtrl.register);
router.get("/:id", assetCtrl.getById);
router.post("/:id/transfer", assetCtrl.transfer);
router.post("/:id/revoke", assetCtrl.revoke);
router.get("/:id/history", assetCtrl.history);

export default router;
