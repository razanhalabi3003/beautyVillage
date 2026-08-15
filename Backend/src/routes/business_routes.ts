import express from "express";
import businessController from "../controllers/business_controller";
import mediaController from "../controllers/media_controller";
import { authMiddleware } from "../controllers/auth_controller";
import { optionalAuthMiddleware } from "../middleware/optional_auth_middleware";
import { authorize } from "../middleware/role_middleware";
import { validate } from "../middleware/validate_middleware";
import { uploadImage } from "../middleware/upload_middleware";
import {
    createBusinessSchema,
    updateBusinessSchema,
    rejectBusinessSchema,
    suspendBusinessSchema,
} from "../validations/business_validation";

const router = express.Router();

// Literal routes are registered before :id to avoid collisions.
router.get("/", businessController.list);

router.get("/mine", authMiddleware, businessController.getMine);

router.get("/pending", authMiddleware, authorize("admin"), businessController.getPending);

// General-purpose admin listing (any/all approvalStatus) - kept separate
// from /pending above, which stays exactly as it was for backward
// compatibility with its existing tests.
router.get("/admin", authMiddleware, authorize("admin"), businessController.listForAdmin);

router.post("/", authMiddleware, authorize("customer", "businessOwner"), validate(createBusinessSchema), businessController.create);

// Action routes (literal suffixes) are registered before the bare /:id
// routes below to keep the pattern consistent with the rest of the app.
router.put("/:id/approve", authMiddleware, authorize("admin"), businessController.approve);

router.put("/:id/reject", authMiddleware, authorize("admin"), validate(rejectBusinessSchema), businessController.reject);

router.put("/:id/suspend", authMiddleware, authorize("admin"), validate(suspendBusinessSchema), businessController.suspend);

// Media upload/delete - owner (businessOwner) only. Multer's memoryStorage
// keeps bytes in memory only; media_controller.ts persists them into MongoDB.
router.post("/:id/logo", authMiddleware, authorize("businessOwner"), uploadImage, mediaController.uploadLogo);

router.post("/:id/cover", authMiddleware, authorize("businessOwner"), uploadImage, mediaController.uploadCover);

router.post("/:id/portfolio", authMiddleware, authorize("businessOwner"), uploadImage, mediaController.uploadPortfolioImage);

router.delete("/:id/portfolio/:mediaId", authMiddleware, authorize("businessOwner"), mediaController.deletePortfolioImage);

// Owner-only content edit. No authorize() role gate is needed here - the
// ownership check inside the controller already excludes admin, since an
// admin's id can never equal a business's owner.
router.put("/:id", authMiddleware, validate(updateBusinessSchema), businessController.update);

router.get("/:id", optionalAuthMiddleware, businessController.getById);

export default router;
