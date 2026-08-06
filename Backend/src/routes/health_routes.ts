import express, { Request, Response } from "express";
import mongoose from "mongoose";
import { sendSuccess } from "../utils/apiResponse";

const router = express.Router();

const DB_STATES: Record<number, string> = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
};

router.get("/", (req: Request, res: Response) => {
    sendSuccess(res, {
        status: "ok",
        database: DB_STATES[mongoose.connection.readyState] || "unknown",
        timestamp: new Date().toISOString(),
    });
});

export default router;
