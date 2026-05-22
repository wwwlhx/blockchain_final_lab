import { Router } from "express";
import * as chainCtrl from "../controllers/chain.controller.js";

const router = Router();

router.get("/health", chainCtrl.health);
router.get("/deployment", chainCtrl.deployment);
router.get("/accounts", chainCtrl.accounts);

export default router;
