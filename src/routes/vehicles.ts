import { Router } from "express";
import { VehicleController } from "../controllers/vehicle.controller";
import { asyncWrapper } from "../core/utils/asyncWrapper";

const router = Router();

router.get("/nearby", asyncWrapper(VehicleController.getNearby));

export default router;
