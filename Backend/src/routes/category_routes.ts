import express from "express";
import categoryController from "../controllers/category_controller";
import { authMiddleware } from "../controllers/auth_controller";
import { optionalAuthMiddleware } from "../middleware/optional_auth_middleware";
import { authorize } from "../middleware/role_middleware";
import { validate } from "../middleware/validate_middleware";
import { createCategorySchema, updateCategorySchema } from "../validations/category_validation";

const router = express.Router();

// optionalAuthMiddleware parses a token if present (without requiring one),
// so the controller can tell an authenticated admin from every other
// caller - public behavior is unchanged for everyone else.
router.get("/", optionalAuthMiddleware, categoryController.list);

router.post("/", authMiddleware, authorize("admin"), validate(createCategorySchema), categoryController.create);

router.put("/:id", authMiddleware, authorize("admin"), validate(updateCategorySchema), categoryController.update);

// Soft delete only - never removes the document, just sets isActive: false.
router.delete("/:id", authMiddleware, authorize("admin"), categoryController.deactivate);

export default router;
