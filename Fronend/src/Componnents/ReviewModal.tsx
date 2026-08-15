import { FC, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import StarRating from "./StarRating";
import { useAppDispatch } from "../redux/hooks";
import { createReview } from "../redux/reviewsSlice";
import useEscapeKey from "../custom_hooks/useEscapeKey";

interface ReviewModalProps {
    appointmentId: string;
    onClose: () => void;
}

const reviewSchema = z.object({
    rating: z.number().min(1, "יש לבחור דירוג").max(5),
    comment: z.string().max(500, "התגובה יכולה להכיל עד 500 תווים").optional(),
});

type ReviewFormValues = z.infer<typeof reviewSchema>;

const ReviewModal: FC<ReviewModalProps> = ({ appointmentId, onClose }) => {
    const dispatch = useAppDispatch();
    const [serverError, setServerError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    useEscapeKey(onClose);

    const {
        control,
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<ReviewFormValues>({
        resolver: zodResolver(reviewSchema),
        defaultValues: { rating: 0, comment: "" },
    });

    const onSubmit = async (values: ReviewFormValues) => {
        setServerError(null);
        try {
            await dispatch(
                createReview({
                    appointment: appointmentId,
                    rating: values.rating as 1 | 2 | 3 | 4 | 5,
                    comment: values.comment || undefined,
                })
            ).unwrap();
            setSuccess(true);
            setTimeout(onClose, 1200);
        } catch (error) {
            setServerError(typeof error === "string" ? error : "אירעה שגיאה בשליחת הביקורת");
        }
    };

    return (
        <>
            <div className="modal d-block" tabIndex={-1} role="dialog" aria-modal="true">
                <div className="modal-dialog modal-dialog-centered" role="document">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">כתיבת ביקורת</h5>
                            <button type="button" className="btn-close" aria-label="סגור" onClick={onClose} />
                        </div>
                        <div className="modal-body">
                            {success ? (
                                <div className="alert alert-success mb-0" role="alert">
                                    תודה על הביקורת!
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit(onSubmit)} noValidate>
                                    {serverError && (
                                        <div className="alert alert-danger" role="alert">
                                            {serverError}
                                        </div>
                                    )}
                                    <div className="mb-3">
                                        <span className="form-label d-block">דירוג</span>
                                        <Controller
                                            control={control}
                                            name="rating"
                                            render={({ field }) => (
                                                <StarRating rating={field.value} onRate={field.onChange} />
                                            )}
                                        />
                                        {errors.rating && (
                                            <div className="text-danger small mt-1">{errors.rating.message}</div>
                                        )}
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label" htmlFor="review-comment">
                                            תגובה (אופציונלי)
                                        </label>
                                        <textarea
                                            id="review-comment"
                                            className={`form-control${errors.comment ? " is-invalid" : ""}`}
                                            rows={3}
                                            maxLength={500}
                                            aria-invalid={!!errors.comment}
                                            aria-describedby={errors.comment ? "review-comment-error" : undefined}
                                            {...register("comment")}
                                        />
                                        {errors.comment && (
                                            <div id="review-comment-error" className="invalid-feedback">
                                                {errors.comment.message}
                                            </div>
                                        )}
                                    </div>
                                    <button type="submit" className="btn btn-primary w-100" disabled={isSubmitting}>
                                        {isSubmitting ? "שולח..." : "שליחת ביקורת"}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <div className="modal-backdrop show" />
        </>
    );
};

export default ReviewModal;
