import { FC, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { Service } from "../types/service";
import { Business } from "../types/business";
import { useAppDispatch } from "../redux/hooks";
import { createAppointment } from "../redux/appointmentsSlice";
import { getAvailableTimeSlots, combineDateAndTime, isSlotInFuture } from "../utils/timeSlots";
import useEscapeKey from "../custom_hooks/useEscapeKey";

interface BookingModalProps {
    business: Business;
    services: Service[];
    onClose: () => void;
}

const bookingSchema = z.object({
    serviceId: z.string().min(1, "יש לבחור שירות"),
    date: z.string().min(1, "יש לבחור תאריך"),
    time: z.string().min(1, "יש לבחור שעה"),
    customerNote: z.string().max(500, "ההערה יכולה להכיל עד 500 תווים").optional(),
});

type BookingFormValues = z.infer<typeof bookingSchema>;

const todayStr = (): string => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

const BookingModal: FC<BookingModalProps> = ({ business, services, onClose }) => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const [serverError, setServerError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    useEscapeKey(onClose);

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<BookingFormValues>({
        resolver: zodResolver(bookingSchema),
        defaultValues: { date: todayStr() },
    });

    const selectedServiceId = watch("serviceId");
    const selectedDate = watch("date");
    const selectedTime = watch("time");
    const selectedService = services.find((service) => service._id === selectedServiceId);

    const timeSlots = useMemo(() => {
        if (!selectedService || !selectedDate) {
            return [];
        }
        const [year, month, day] = selectedDate.split("-").map(Number);
        const dateObj = new Date(year, month - 1, day);
        return getAvailableTimeSlots(business.workingHours, dateObj, selectedService.durationMinutes).filter((slot) =>
            isSlotInFuture(selectedDate, slot)
        );
    }, [business.workingHours, selectedService, selectedDate]);

    const onSubmit = async (values: BookingFormValues) => {
        setServerError(null);
        const startDateTime = combineDateAndTime(values.date, values.time);
        try {
            await dispatch(
                createAppointment({
                    business: business._id,
                    service: values.serviceId,
                    startDateTime: startDateTime.toISOString(),
                    customerNote: values.customerNote || undefined,
                })
            ).unwrap();
            setSuccess(true);
            setTimeout(() => navigate("/my-appointments"), 1200);
        } catch (error) {
            setServerError(typeof error === "string" ? error : "אירעה שגיאה בקביעת התור");
        }
    };

    return (
        <>
            <div className="modal d-block" tabIndex={-1} role="dialog" aria-modal="true">
                <div className="modal-dialog modal-dialog-centered" role="document">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">קביעת תור</h5>
                            <button type="button" className="btn-close" aria-label="סגור" onClick={onClose} />
                        </div>
                        <div className="modal-body">
                            {success ? (
                                <div className="alert alert-success mb-0" role="alert">
                                    התור נקבע בהצלחה! מעבירים אתכם לתורים שלכם...
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit(onSubmit)} noValidate>
                                    {serverError && (
                                        <div className="alert alert-danger" role="alert">
                                            {serverError}
                                        </div>
                                    )}
                                    <div className="mb-3">
                                        <label className="form-label" htmlFor="serviceId">
                                            שירות
                                        </label>
                                        <select
                                            id="serviceId"
                                            className={`form-select${errors.serviceId ? " is-invalid" : ""}`}
                                            aria-invalid={!!errors.serviceId}
                                            aria-describedby={errors.serviceId ? "serviceId-error" : undefined}
                                            {...register("serviceId")}
                                        >
                                            <option value="">בחרו שירות</option>
                                            {services.map((service) => (
                                                <option key={service._id} value={service._id}>
                                                    {service.name} - {service.price} ₪ ({service.durationMinutes}{" "}
                                                    דק')
                                                </option>
                                            ))}
                                        </select>
                                        {errors.serviceId && (
                                            <div id="serviceId-error" className="invalid-feedback">
                                                {errors.serviceId.message}
                                            </div>
                                        )}
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label" htmlFor="booking-date">
                                            תאריך
                                        </label>
                                        <input
                                            id="booking-date"
                                            type="date"
                                            min={todayStr()}
                                            className={`form-control${errors.date ? " is-invalid" : ""}`}
                                            aria-invalid={!!errors.date}
                                            aria-describedby={errors.date ? "booking-date-error" : undefined}
                                            {...register("date")}
                                        />
                                        {errors.date && (
                                            <div id="booking-date-error" className="invalid-feedback">
                                                {errors.date.message}
                                            </div>
                                        )}
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label" htmlFor="booking-time">
                                            שעה
                                        </label>
                                        <select
                                            id="booking-time"
                                            className={`form-select${errors.time ? " is-invalid" : ""}`}
                                            aria-invalid={!!errors.time}
                                            aria-describedby={errors.time ? "booking-time-error" : undefined}
                                            disabled={!selectedService || !selectedDate}
                                            {...register("time")}
                                        >
                                            <option value="">בחרו שעה</option>
                                            {timeSlots.map((slot) => (
                                                <option key={slot} value={slot}>
                                                    {slot}
                                                </option>
                                            ))}
                                        </select>
                                        {errors.time && (
                                            <div id="booking-time-error" className="invalid-feedback">
                                                {errors.time.message}
                                            </div>
                                        )}
                                        {selectedService && selectedDate && timeSlots.length === 0 && (
                                            <div className="form-text text-danger">
                                                אין שעות זמינות בתאריך זה - נסו תאריך אחר
                                            </div>
                                        )}
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label" htmlFor="customerNote">
                                            הערה (אופציונלי)
                                        </label>
                                        <textarea
                                            id="customerNote"
                                            className={`form-control${errors.customerNote ? " is-invalid" : ""}`}
                                            rows={2}
                                            maxLength={500}
                                            aria-invalid={!!errors.customerNote}
                                            aria-describedby={errors.customerNote ? "customerNote-error" : undefined}
                                            {...register("customerNote")}
                                        />
                                        {errors.customerNote && (
                                            <div id="customerNote-error" className="invalid-feedback">
                                                {errors.customerNote.message}
                                            </div>
                                        )}
                                    </div>

                                    {selectedService && selectedDate && selectedTime && (
                                        <div
                                            className="p-3 mb-3 rounded"
                                            style={{ backgroundColor: "var(--bv-bg-alt)" }}
                                        >
                                            <p className="mb-1 fw-medium">סיכום ההזמנה</p>
                                            <p className="mb-1 small">שירות: {selectedService.name}</p>
                                            <p className="mb-1 small">
                                                תאריך ושעה: {selectedDate} בשעה {selectedTime}
                                            </p>
                                            <p className="mb-0 small">מחיר: {selectedService.price} ₪</p>
                                        </div>
                                    )}

                                    <button type="submit" className="btn btn-primary w-100" disabled={isSubmitting}>
                                        {isSubmitting ? "קובע תור..." : "אישור קביעת התור"}
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

export default BookingModal;
