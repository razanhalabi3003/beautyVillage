import express from "express";
import userController from "../controllers/user_controller";
import { authMiddleware } from "../controllers/auth_controller";
import { authorize } from "../middleware/role_middleware";
import { validate } from "../middleware/validate_middleware";
import { updateProfileSchema, adminStatusSchema } from "../validations/user_validation";

const router = express.Router();

// Literal routes are registered before :id routes to avoid collisions.
router.get("/", authMiddleware, authorize("admin"), userController.list);

router.put("/:id/status", authMiddleware, authorize("admin"), validate(adminStatusSchema), userController.updateStatus);

router.get("/:id", authMiddleware, userController.getById);

router.put("/:id", authMiddleware, validate(updateProfileSchema), userController.updateProfile);

export default router;
