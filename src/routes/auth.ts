import { Router } from "express";
import { authenticate } from "../core/middleware/auth";
import { AuthController } from "../controllers/auth.controller";
import { asyncWrapper } from "../core/utils/asyncWrapper";

const router = Router();

router.get("/me", authenticate, asyncWrapper(AuthController.getMe));
router.post("/verify/:driverId", authenticate, asyncWrapper(AuthController.verifyDriver));
router.post("/register", asyncWrapper(AuthController.register));
router.post("/login", asyncWrapper(AuthController.login));
router.get("/oauth/:provider", asyncWrapper(AuthController.oauth));
router.post("/sync", asyncWrapper(AuthController.sync));

export default router;
