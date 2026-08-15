import express from "express";
import mediaController from "../controllers/media_controller";
import { optionalAuthMiddleware } from "../middleware/optional_auth_middleware";

const router = express.Router();

router.get("/business/:businessId", optionalAuthMiddleware, mediaController.getBusinessMedia);

router.get("/:id", optionalAuthMiddleware, mediaController.getMediaBytes);

export default router;
