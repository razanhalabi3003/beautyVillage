import { FC, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAppDispatch } from "../redux/hooks";
import { rejectBusiness } from "../redux/businessesSlice";
import useEscapeKey from "../custom_hooks/useEscapeKey";

interface RejectBusinessModalProps {
    businessId: string;
    businessName: string;
    onClose: () => void;
}

// min/max mirror the backend's rejectBusinessSchema exactly (3-500 chars).
const rejectSchema = z.object({
    rejectionReason: z.string().min(3, "יש להזין סיבה של לפחות 3 תווים").max(500, "הסיבה ארוכה מדי (עד 500 תווים)"),
});

type RejectFormValues = z.infer<typeof rejectSchema>;

const RejectBusinessModal: FC<RejectBusinessModalProps> = ({ businessId, businessName, onClose }) => {
    const dispatch = useAppDispatch();
    const [serverError, setServerError] = useState<string | null>(null);
    useEscapeKey(onClose);
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<RejectFormValues>({
        resolver: zodResolver(rejectSchema),
        defaultValues: { rejectionReason: "" },
    });

    const onSubmit = async (values: RejectFormValues) => {
        setServerError(null);
        try {
            await dispatch(rejectBusiness({ id: businessId, rejectionReason: values.rejectionReason })).unwrap();
            onClose();
        } catch (error) {
            setServerError(typeof error === "string" ? error : "אירעה שגיאה בדחיית העסק");
        }
    };

    return (
        <>
            <div className="modal d-block" tabIndex={-1} role="dialog" aria-modal="true">
                <div className="modal-dialog modal-dialog-centered" role="document">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">דחיית עסק: {businessName}</h5>
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
                                    <label className="form-label" htmlFor="reject-reason">
                                        סיבת הדחייה
                                    </label>
                                    <textarea
                                        id="reject-reason"
                                        className={`form-control${errors.rejectionReason ? " is-invalid" : ""}`}
                                        rows={3}
                                        maxLength={500}
                                        aria-invalid={!!errors.rejectionReason}
                                        aria-describedby={errors.rejectionReason ? "reject-reason-error" : undefined}
                                        {...register("rejectionReason")}
                                    />
                                    {errors.rejectionReason && (
                                        <div id="reject-reason-error" className="invalid-feedback">
                                            {errors.rejectionReason.message}
                                        </div>
                                    )}
                                </div>
                                <div className="d-flex gap-2">
                                    <button type="submit" className="btn btn-danger" disabled={isSubmitting}>
                                        {isSubmitting ? "דוחה..." : "דחיית העסק"}
                                    </button>
                                    <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
                                        ביטול
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
            <div className="modal-backdrop show" />
        </>
    );
};

export default RejectBusinessModal;
