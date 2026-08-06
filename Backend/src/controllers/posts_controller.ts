import postsModel from "../models/posts_model";
import { Error, ObjectId } from "mongoose";
import { Request, Response } from "express";
import BaseController from "./base_controller";

class PostController extends BaseController {
    constructor(model: any) {
        super(model);
    }

    async createItem(req: Request, res: Response) {
        // authMiddleware always sets req.user before this runs; this check is
        // a defensive guard against creating a post with an invalid owner if
        // that were ever somehow not the case.
        if (!req.user?.id) {
            res.status(401).json({
                success: false,
                message: "Unauthorized",
                errors: [],
            });
            return;
        }
        const post = {
            ...req.body,
            owner: req.user.id
        }
        req.body = post;
        return super.createItem(req, res);
    };
}


export default new PostController(postsModel);