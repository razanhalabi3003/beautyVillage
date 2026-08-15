import express from "express";
import serviceController from "../controllers/service_controller";
import { authMiddleware } from "../controllers/auth_controller";
import { optionalAuthMiddleware } from "../middleware/optional_auth_middleware";
import { authorize } from "../middleware/role_middleware";
import { validate } from "../middleware/validate_middleware";
import { createServiceSchema, updateServiceSchema } from "../validations/service_validation";

const router = express.Router();

router.get("/business/:businessId", optionalAuthMiddleware, serviceController.list);

router.post("/", authMiddleware, authorize("businessOwner"), validate(createServiceSchema), serviceController.create);

router.put("/:id", authMiddleware, validate(updateServiceSchema), serviceController.update);

// Soft delete only - never removes the document, just sets isActive: false.
router.delete("/:id", authMiddleware, serviceController.deactivate);

export default router;
