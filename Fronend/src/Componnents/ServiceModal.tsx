import { FC, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import serviceService from "../services/service-service";
import { Service } from "../types/service";
import { getApiErrorMessage } from "../utils/apiError";
import useEscapeKey from "../custom_hooks/useEscapeKey";

interface ServiceModalProps {
    businessId: string;
    service?: Service;
    onClose: () => void;
    onSaved: (service: Service) => void;
}

const serviceSchema = z.object({
    name: z.string().min(2, "שם השירות חייב להכיל לפחות 2 תווים").max(100, "שם השירות ארוך מדי"),
    description: z.string().max(1000, "התיאור יכול להכיל עד 1000 תווים").optional(),
    price: z.coerce.number().min(0, "המחיר חייב להיות 0 ומעלה"),
    durationMinutes: z.coerce
        .number()
        .int("משך הזמן חייב להיות מספר שלם של דקות")
        .min(5, "משך הזמן חייב להיות לפחות 5 דקות"),
});

type ServiceFormValues = z.infer<typeof serviceSchema>;

const ServiceModal: FC<ServiceModalProps> = ({ businessId, service, onClose, onSaved }) => {
    const isEditMode = !!service;
    const [serverError, setServerError] = useState<string | null>(null);
    useEscapeKey(onClose);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<ServiceFormValues>({
        resolver: zodResolver(serviceSchema),
        defaultValues: {
            name: service?.name ?? "",
            description: service?.description ?? "",
            price: service?.price ?? 0,
            durationMinutes: service?.durationMinutes ?? 30,
        },
    });

    const onSubmit = async (values: ServiceFormValues) => {
        setServerError(null);
        // An empty textarea submits "" - the backend's Joi schema treats an
        // empty description as invalid rather than absent, so it must be
        // omitted entirely, not sent as "".
        const payload = { ...values, description: values.description || undefined };
        try {
            const response = isEditMode
                ? await serviceService.update(service._id, payload)
                : await serviceService.create({ business: businessId, ...payload });
            onSaved(response.data.data);
            onClose();
        } catch (error) {
            setServerError(getApiErrorMessage(error, "אירעה שגיאה בשמירת השירות"));
        }
    };

    return (
        <>
            <div className="modal d-block" tabIndex={-1} role="dialog" aria-modal="true">
                <div className="modal-dialog modal-dialog-centered" role="document">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">{isEditMode ? "עריכת שירות" : "הוספת שירות"}</h5>
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
                                    <label className="form-label" htmlFor="service-name">
                                        שם השירות
                                    </label>
                                    <input
                                        id="service-name"
                                        type="text"
                                        className={`form-control${errors.name ? " is-invalid" : ""}`}
                                        aria-invalid={!!errors.name}
                                        aria-describedby={errors.name ? "service-name-error" : undefined}
                                        {...register("name")}
                                    />
                                    {errors.name && (
                                        <div id="service-name-error" className="invalid-feedback">
                                            {errors.name.message}
                                        </div>
                                    )}
                                </div>
                                <div className="mb-3">
                                    <label className="form-label" htmlFor="service-description">
                                        תיאור (אופציונלי)
                                    </label>
                                    <textarea
                                        id="service-description"
                                        className={`form-control${errors.description ? " is-invalid" : ""}`}
                                        rows={2}
                                        maxLength={1000}
                                        aria-invalid={!!errors.description}
                                        aria-describedby={errors.description ? "service-description-error" : undefined}
                                        {...register("description")}
                                    />
                                    {errors.description && (
                                        <div id="service-description-error" className="invalid-feedback">
                                            {errors.description.message}
                                        </div>
                                    )}
                                </div>
                                <div className="row g-3 mb-3">
                                    <div className="col-6">
                                        <label className="form-label" htmlFor="service-price">
                                            מחיר (₪)
                                        </label>
                                        <input
                                            id="service-price"
                                            type="number"
                                            min={0}
                                            step="1"
                                            className={`form-control${errors.price ? " is-invalid" : ""}`}
                                            aria-invalid={!!errors.price}
                                            aria-describedby={errors.price ? "service-price-error" : undefined}
                                            {...register("price")}
                                        />
                                        {errors.price && (
                                            <div id="service-price-error" className="invalid-feedback">
                                                {errors.price.message}
                                            </div>
                                        )}
                                    </div>
                                    <div className="col-6">
                                        <label className="form-label" htmlFor="service-duration">
                                            משך (דקות)
                                        </label>
                                        <input
                                            id="service-duration"
                                            type="number"
                                            min={5}
                                            step="5"
                                            className={`form-control${errors.durationMinutes ? " is-invalid" : ""}`}
                                            aria-invalid={!!errors.durationMinutes}
                                            aria-describedby={errors.durationMinutes ? "service-duration-error" : undefined}
                                            {...register("durationMinutes")}
                                        />
                                        {errors.durationMinutes && (
                                            <div id="service-duration-error" className="invalid-feedback">
                                                {errors.durationMinutes.message}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <button type="submit" className="btn btn-primary w-100" disabled={isSubmitting}>
                                    {isSubmitting ? "שומר..." : isEditMode ? "שמירת שינויים" : "הוספת שירות"}
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

export default ServiceModal;
