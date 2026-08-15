import express from "express";
import appointmentController from "../controllers/appointment_controller";
import { authMiddleware } from "../controllers/auth_controller";
import { authorize } from "../middleware/role_middleware";
import { validate } from "../middleware/validate_middleware";
import {
    createAppointmentSchema,
    ownerStatusUpdateSchema,
    cancelAppointmentSchema,
} from "../validations/appointment_validation";

const router = express.Router();

// Literal routes are registered before :id to avoid collisions.
router.get("/mine", authMiddleware, appointmentController.getMine);

router.get("/business/:businessId", authMiddleware, appointmentController.getBusinessAppointments);

router.post("/", authMiddleware, authorize("customer", "businessOwner"), validate(createAppointmentSchema), appointmentController.create);

// Owner-only, by design - not even admin can use this (see the Stage 7
// admin-permissions correction). No authorize() role gate is needed; the
// ownership check inside the controller already excludes everyone else.
router.put("/:id/status", authMiddleware, validate(ownerStatusUpdateSchema), appointmentController.updateStatus);

router.put("/:id/cancel", authMiddleware, validate(cancelAppointmentSchema), appointmentController.cancel);

export default router;
