import { FC } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import useCategories from "../custom_hooks/useCategories";
import WorkingHoursEditor, { defaultWorkingHours, workingHourSchema } from "./WorkingHoursEditor";
import { Business } from "../types/business";

export const businessFormSchema = z.object({
    name: z.string().min(2, "שם העסק חייב להכיל לפחות 2 תווים").max(100, "שם העסק ארוך מדי"),
    description: z.string().min(10, "התיאור חייב להכיל לפחות 10 תווים").max(2000, "התיאור ארוך מדי"),
    category: z.string().min(1, "יש לבחור קטגוריה"),
    address: z.string().min(5, "הכתובת חייבת להכיל לפחות 5 תווים").max(200, "הכתובת ארוכה מדי"),
    phone: z.string().regex(/^0\d{8,9}$/, "מספר טלפון לא תקין"),
    workingHours: z.array(workingHourSchema).length(7),
});

export type BusinessFormValues = z.infer<typeof businessFormSchema>;

export const emptyBusinessFormValues: BusinessFormValues = {
    name: "",
    description: "",
    category: "",
    address: "",
    phone: "",
    workingHours: defaultWorkingHours,
};

// Shared by DashboardBusiness (editing an approved/suspended business) and
// SubmitBusiness (creating a new one, or editing a pending/rejected one) -
// same fields, same validation, same working-hours editor either way.
export const businessToFormValues = (business: Business): BusinessFormValues => ({
    name: business.name,
    description: business.description,
    category: typeof business.category === "string" ? business.category : business.category._id,
    address: business.address,
    phone: business.phone,
    workingHours: defaultWorkingHours.map((fallback) => {
        const existing = business.workingHours.find((wh) => wh.day === fallback.day);
        return existing ? { ...fallback, ...existing } : fallback;
    }),
});

interface BusinessFormProps {
    defaultValues: BusinessFormValues;
    onSubmit: (values: BusinessFormValues) => Promise<void>;
    submitLabel: string;
    submittingLabel: string;
}

const BusinessForm: FC<BusinessFormProps> = ({ defaultValues, onSubmit, submitLabel, submittingLabel }) => {
    const { categories } = useCategories();
    const methods = useForm<BusinessFormValues>({
        resolver: zodResolver(businessFormSchema),
        defaultValues,
    });
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = methods;

    // Only the create flow starts with an empty category - a blank
    // placeholder option keeps the select from silently defaulting to
    // whichever category happens to render first.
    const showCategoryPlaceholder = defaultValues.category === "";

    return (
        <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <div className="mb-3">
                    <label className="form-label" htmlFor="business-name">
                        שם העסק
                    </label>
                    <input
                        id="business-name"
                        type="text"
                        className={`form-control${errors.name ? " is-invalid" : ""}`}
                        aria-invalid={!!errors.name}
                        {...register("name")}
                    />
                    {errors.name && <div className="invalid-feedback">{errors.name.message}</div>}
                </div>

                <div className="mb-3">
                    <label className="form-label" htmlFor="business-description">
                        תיאור
                    </label>
                    <textarea
                        id="business-description"
                        className={`form-control${errors.description ? " is-invalid" : ""}`}
                        rows={4}
                        maxLength={2000}
                        aria-invalid={!!errors.description}
                        {...register("description")}
                    />
                    {errors.description && <div className="invalid-feedback">{errors.description.message}</div>}
                </div>

                <div className="mb-3">
                    <label className="form-label" htmlFor="business-category">
                        קטגוריה
                    </label>
                    <select
                        id="business-category"
                        className={`form-select${errors.category ? " is-invalid" : ""}`}
                        aria-invalid={!!errors.category}
                        {...register("category")}
                    >
                        {showCategoryPlaceholder && (
                            <option value="" disabled>
                                בחר קטגוריה
                            </option>
                        )}
                        {categories.map((cat) => (
                            <option key={cat._id} value={cat._id}>
                                {cat.name}
                            </option>
                        ))}
                    </select>
                    {errors.category && <div className="invalid-feedback">{errors.category.message}</div>}
                </div>

                <div className="row g-3 mb-3">
                    <div className="col-12 col-md-8">
                        <label className="form-label" htmlFor="business-address">
                            כתובת
                        </label>
                        <input
                            id="business-address"
                            type="text"
                            className={`form-control${errors.address ? " is-invalid" : ""}`}
                            aria-invalid={!!errors.address}
                            {...register("address")}
                        />
                        {errors.address && <div className="invalid-feedback">{errors.address.message}</div>}
                    </div>
                    <div className="col-12 col-md-4">
                        <label className="form-label" htmlFor="business-phone">
                            טלפון
                        </label>
                        <input
                            id="business-phone"
                            type="tel"
                            className={`form-control${errors.phone ? " is-invalid" : ""}`}
                            aria-invalid={!!errors.phone}
                            {...register("phone")}
                        />
                        {errors.phone && <div className="invalid-feedback">{errors.phone.message}</div>}
                    </div>
                </div>

                <div className="mb-3">
                    <label className="form-label">שעות פעילות</label>
                    <WorkingHoursEditor />
                </div>

                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                    {isSubmitting ? submittingLabel : submitLabel}
                </button>
            </form>
        </FormProvider>
    );
};

export default BusinessForm;
