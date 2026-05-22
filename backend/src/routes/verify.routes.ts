import { Router } from "express";
import { verify } from "../controllers/verify.controller.js";

const router = Router();

router.post("/:id/verify", verify);

export default router;
