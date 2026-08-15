import { Request, Response } from "express";
import categoryModel from "../models/category_model";
import slugify from "../utils/slugify";
import asyncHandler from "../utils/asyncHandler";
import { sendSuccess, sendList } from "../utils/apiResponse";

const list = asyncHandler(async (req: Request, res: Response) => {
    // Public/customer/businessOwner callers only ever see active categories;
    // an authenticated admin sees everything, including deactivated ones,
    // so there is somewhere to find and reactivate them from.
    const isAdmin = req.user?.role === "admin";
    const filter = isAdmin ? {} : { isActive: true };
    const categories = await categoryModel.find(filter).sort({ name: 1 });
    sendList(res, categories, {
        page: 1,
        limit: categories.length,
        total: categories.length,
        totalPages: 1,
    });
});

const create = asyncHandler(async (req: Request, res: Response) => {
    const { name, image } = req.body;
    const category = await categoryModel.create({
        name,
        slug: slugify(name),
        image,
        isActive: true,
    });
    sendSuccess(res, category, 201);
});

const update = asyncHandler(async (req: Request, res: Response) => {
    const updates: { name?: string; image?: string; slug?: string } = { ...req.body };
    if (updates.name) {
        updates.slug = slugify(updates.name);
    }
    const category = await categoryModel.findByIdAndUpdate(
        req.params.id,
        { $set: updates },
        { new: true, runValidators: true }
    );
    if (!category) {
        res.status(404).json({ success: false, message: "Category not found", errors: [] });
        return;
    }
    sendSuccess(res, category);
});

const deactivate = asyncHandler(async (req: Request, res: Response) => {
    const category = await categoryModel.findByIdAndUpdate(
        req.params.id,
        { $set: { isActive: false } },
        { new: true }
    );
    if (!category) {
        res.status(404).json({ success: false, message: "Category not found", errors: [] });
        return;
    }
    sendSuccess(res, category);
});

export default { list, create, update, deactivate };
