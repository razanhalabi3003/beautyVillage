import { FC, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAppDispatch } from "../redux/hooks";
import { createCategory, updateCategory } from "../redux/categoriesSlice";
import { Category } from "../types/category";
import useEscapeKey from "../custom_hooks/useEscapeKey";

interface CategoryModalProps {
    category?: Category;
    onClose: () => void;
}

// Slug is never part of this form - it is always server-derived from name.
const categorySchema = z.object({
    name: z.string().min(2, "שם הקטגוריה חייב להכיל לפחות 2 תווים").max(50, "שם הקטגוריה ארוך מדי"),
    image: z.string().max(300, "כתובת התמונה ארוכה מדי").optional(),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

const CategoryModal: FC<CategoryModalProps> = ({ category, onClose }) => {
    const dispatch = useAppDispatch();
    const isEditMode = !!category;
    const [serverError, setServerError] = useState<string | null>(null);
    useEscapeKey(onClose);
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<CategoryFormValues>({
        resolver: zodResolver(categorySchema),
        defaultValues: {
            name: category?.name ?? "",
            image: category?.image ?? "",
        },
    });

    const onSubmit = async (values: CategoryFormValues) => {
        setServerError(null);
        // An empty text input submits "" - omit it entirely rather than
        // sending an empty image URL (same fix as ServiceModal's description).
        const payload = { name: values.name, image: values.image || undefined };
        try {
            if (isEditMode) {
                await dispatch(updateCategory({ id: category._id, data: payload })).unwrap();
            } else {
                await dispatch(createCategory(payload)).unwrap();
            }
            onClose();
        } catch (error) {
            setServerError(typeof error === "string" ? error : "אירעה שגיאה בשמירת הקטגוריה");
        }
    };

    return (
        <>
            <div className="modal d-block" tabIndex={-1} role="dialog" aria-modal="true">
                <div className="modal-dialog modal-dialog-centered" role="document">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">{isEditMode ? "עריכת קטגוריה" : "הוספת קטגוריה"}</h5>
                            <button type="button" className="btn-close" aria-label="סגור" onClick={onClose} />
                        </div>
                        <div className="modal-body">
                            {serverError && (
                                <div className="alert alert-danger" role="alert">
                                    {serverError}
                                </div>
                            )}
                            <form onSubmit={handleSubmit(onSubmit)} noValidate>
                                <div className="mb-3">
                                    <label className="form-label" htmlFor="category-name">
                                        שם הקטגוריה
                                    </label>
                                    <input
                                        id="category-name"
                                        type="text"
                                        className={`form-control${errors.name ? " is-invalid" : ""}`}
                                        aria-invalid={!!errors.name}
                                        aria-describedby={errors.name ? "category-name-error" : undefined}
                                        {...register("name")}
                                    />
                                    {errors.name && (
                                        <div id="category-name-error" className="invalid-feedback">
                                            {errors.name.message}
                                        </div>
                                    )}
                                </div>
                                <div className="mb-3">
                                    <label className="form-label" htmlFor="category-image">
                                        כתובת תמונה (אופציונלי)
                                    </label>
                                    <input
                                        id="category-image"
                                        type="text"
                                        className={`form-control${errors.image ? " is-invalid" : ""}`}
                                        aria-invalid={!!errors.image}
                                        aria-describedby={errors.image ? "category-image-error" : undefined}
                                        {...register("image")}
                                    />
                                    {errors.image && (
                                        <div id="category-image-error" className="invalid-feedback">
                                            {errors.image.message}
                                        </div>
                                    )}
                                </div>
                                <button type="submit" className="btn btn-primary w-100" disabled={isSubmitting}>
                                    {isSubmitting ? "שומר..." : isEditMode ? "שמירת שינויים" : "הוספת קטגוריה"}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
            <div className="modal-backdrop show" />
        </>
    );
};

export default CategoryModal;
