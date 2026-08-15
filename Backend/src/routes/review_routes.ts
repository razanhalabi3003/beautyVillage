import express from "express";
import reviewController from "../controllers/review_controller";
import { authMiddleware } from "../controllers/auth_controller";
import { optionalAuthMiddleware } from "../middleware/optional_auth_middleware";
import { authorize } from "../middleware/role_middleware";
import { validate } from "../middleware/validate_middleware";
import { createReviewSchema, visibilitySchema } from "../validations/review_validation";

const router = express.Router();

// Literal routes are registered before :id to avoid collisions.
router.get("/admin", authMiddleware, authorize("admin"), reviewController.listForAdmin);

router.get("/mine", authMiddleware, authorize("customer", "businessOwner"), reviewController.listMine);

router.get("/business/:businessId", optionalAuthMiddleware, reviewController.listByBusiness);

router.post("/", authMiddleware, authorize("customer", "businessOwner"), validate(createReviewSchema), reviewController.create);

router.put("/:id/visibility", authMiddleware, authorize("admin"), validate(visibilitySchema), reviewController.updateVisibility);

export default router;
