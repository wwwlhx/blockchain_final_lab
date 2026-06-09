import { Router } from "express";

import * as walletCtrl from "../controllers/wallet.controller.js";

const router = Router();

router.post("/wallet/register/prepare", walletCtrl.prepareRegistration);
router.post("/wallet/register/confirm", walletCtrl.confirmRegistration);
router.post("/wallet/action/confirm", walletCtrl.confirmAction);
router.get("/transactions/:hash", walletCtrl.transaction);
router.post("/sync", walletCtrl.sync);

export default router;
