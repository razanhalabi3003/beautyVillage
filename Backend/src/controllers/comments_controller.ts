import commentsModel from "../models/comments_model";
import { Error, ObjectId } from "mongoose";
import { Request, Response } from "express";
import BaseController from "./base_controller";

const commentsController = new BaseController(commentsModel);


export default commentsController;