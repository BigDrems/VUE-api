import { Router } from "express";
import { authenticate, requireDriver } from "../core/middleware/auth";
import { ShiftController } from "../controllers/shift.controller";
import { asyncWrapper } from "../core/utils/asyncWrapper";

const router = Router();

router.post("/start", authenticate, requireDriver, asyncWrapper(ShiftController.startShift));
router.post("/end", authenticate, requireDriver, asyncWrapper(ShiftController.endShift));

export default router;
