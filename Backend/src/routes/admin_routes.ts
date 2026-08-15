import express from "express";
import adminController from "../controllers/admin_controller";
import { authMiddleware } from "../controllers/auth_controller";
import { authorize } from "../middleware/role_middleware";

const router = express.Router();

router.get("/stats", authMiddleware, authorize("admin"), adminController.getStats);

export default router;
