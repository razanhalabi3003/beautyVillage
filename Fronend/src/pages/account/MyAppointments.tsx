import { FC, useEffect, useMemo, useState } from "react";
import useAppointments from "../../custom_hooks/useAppointments";
import { useAppDispatch, useAppSelector } from "../../redux/hooks";
import { fetchMyReviews } from "../../redux/reviewsSlice";
import { cancelAppointment } from "../../redux/appointmentsSlice";
import { Appointment } from "../../types/appointment";
import LoadingSpinner from "../../Componnents/LoadingSpinner";
import ErrorMessage from "../../Componnents/ErrorMessage";
import EmptyState from "../../Componnents/EmptyState";
import ConfirmDialog from "../../Componnents/ConfirmDialog";
import ReviewModal from "../../Componnents/ReviewModal";
import { appointmentStatusLabels, appointmentStatusColors, formatAppointmentDateTime } from "../../utils/appointmentStatus";

// Mirrors the backend's own cancellation eligibility exactly (customer/
// businessOwner-as-customer path) - the backend remains the final authority
// regardless of what this hides/shows.
const isCancellable = (appointment: Appointment): boolean =>
    (appointment.status === "pending" || appointment.status === "confirmed") &&
    new Date(appointment.startDateTime).getTime() > Date.now();

const MyAppointments: FC = () => {
    const dispatch = useAppDispatch();
    const { appointments, isLoading, error } = useAppointments("mine");
    const myReviews = useAppSelector((state) => state.reviews.mine);

    const [cancelingId, setCancelingId] = useState<string | null>(null);
    const [cancelReason, setCancelReason] = useState("");
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [cancelError, setCancelError] = useState<string | null>(null);
    const [reviewTargetId, setReviewTargetId] = useState<string | null>(null);

    useEffect(() => {
        dispatch(fetchMyReviews());
    }, [dispatch]);

    // Reviews may be hidden by an admin and would still count as "already
    // reviewed" - GET /reviews/mine always includes them regardless of
    // isVisible, unlike the public per-business listing.
    const reviewedAppointmentIds = useMemo(() => new Set(myReviews.map((review) => review.appointment)), [myReviews]);

    const { upcoming, history } = useMemo(() => {
        const upcomingList = appointments
            .filter(
                (appointment) =>
                    (appointment.status === "pending" || appointment.status === "confirmed") &&
                    new Date(appointment.startDateTime).getTime() > Date.now()
            )
            .sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime());
        const upcomingIds = new Set(upcomingList.map((appointment) => appointment._id));
        const historyList = appointments.filter((appointment) => !upcomingIds.has(appointment._id));
        return { upcoming: upcomingList, history: historyList };
    }, [appointments]);

    const startCancel = (appointmentId: string) => {
        setCancelingId(appointmentId);
        setCancelReason("");
        setCancelError(null);
    };

    const handleConfirmCancel = async () => {
        if (!cancelingId) {
            return;
        }
        setCancelError(null);
        try {
            await dispatch(
                cancelAppointment({ id: cancelingId, cancellationReason: cancelReason || undefined })
            ).unwrap();
            setConfirmDialogOpen(false);
            setCancelingId(null);
            setCancelReason("");
        } catch (submitError) {
            setConfirmDialogOpen(false);
            setCancelError(typeof submitError === "string" ? submitError : "אירעה שגיאה בביטול התור");
        }
    };

    const renderAppointmentCard = (appointment: Appointment) => {
        const businessName = typeof appointment.business === "string" ? "" : appointment.business.name;
        const serviceName = typeof appointment.service === "string" ? "" : appointment.service.name;
        const servicePrice = typeof appointment.service === "string" ? undefined : appointment.service.price;
        const serviceDuration =
            typeof appointment.service === "string" ? undefined : appointment.service.durationMinutes;
        const isCanceling = cancelingId === appointment._id;

        return (
            <div key={appointment._id} className="card p-3 mb-3">
                <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
                    <div>
                        <h3 className="h6 mb-1">{businessName}</h3>
                        <p className="mb-1 small text-muted">
                            {serviceName}
                            {servicePrice !== undefined && ` · ${servicePrice} ₪`}
                            {serviceDuration !== undefined && ` · ${serviceDuration} דק'`}
                        </p>
                        <p className="mb-1 small">{formatAppointmentDateTime(appointment.startDateTime)}</p>
                        {appointment.customerNote && (
                            <p className="mb-1 small text-muted">הערה: {appointment.customerNote}</p>
                        )}
                        {appointment.cancellationReason && (
                            <p className="mb-1 small text-muted">סיבת ביטול: {appointment.cancellationReason}</p>
                        )}
                    </div>
                    <span
                        className="badge rounded-pill"
                        style={{
                            backgroundColor: "var(--bv-bg-alt)",
                            color: appointmentStatusColors[appointment.status] ?? "var(--bv-text)",
                        }}
                    >
                        {appointmentStatusLabels[appointment.status] ?? appointment.status}
                    </span>
                </div>

                <div className="d-flex gap-2 mt-2">
                    {isCancellable(appointment) && !isCanceling && (
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => startCancel(appointment._id)}
                        >
                            ביטול תור
                        </button>
                    )}
                    {appointment.status === "completed" && !reviewedAppointmentIds.has(appointment._id) && (
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => setReviewTargetId(appointment._id)}
                        >
                            כתבו ביקורת
                        </button>
                    )}
                </div>

                {isCanceling && (
                    <div className="mt-3 pt-3 border-top">
                        {cancelError && (
                            <div className="alert alert-danger py-2 small" role="alert">
                                {cancelError}
                            </div>
                        )}
                        <label className="form-label small" htmlFor={`cancel-reason-${appointment._id}`}>
                            סיבת ביטול (אופציונלי)
                        </label>
                        <textarea
                            id={`cancel-reason-${appointment._id}`}
                            className="form-control form-control-sm mb-2"
                            rows={2}
                            maxLength={500}
                            value={cancelReason}
                            onChange={(event) => setCancelReason(event.target.value)}
                        />
                        <div className="d-flex gap-2">
                            <button
                                type="button"
                                className="btn btn-sm btn-danger"
                                onClick={() => setConfirmDialogOpen(true)}
                            >
                                אישור ביטול תור
                            </button>
                            <button
                                type="button"
                                className="btn btn-sm btn-outline-secondary"
                                onClick={() => setCancelingId(null)}
                            >
                                חזרה
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    if (isLoading) {
        return <LoadingSpinner />;
    }
    if (error) {
        return <ErrorMessage message={error} />;
    }

    return (
        <div className="container">
            <h1 className="h3 mb-4">התורים שלי</h1>

            <section className="mb-4">
                <h2 className="h5 mb-3">תורים קרובים</h2>
                {upcoming.length === 0 ? <EmptyState title="אין תורים קרובים" /> : upcoming.map(renderAppointmentCard)}
            </section>

            <section>
                <h2 className="h5 mb-3">היסטוריית תורים</h2>
                {history.length === 0 ? (
                    <EmptyState title="אין היסטוריית תורים" />
                ) : (
                    history.map(renderAppointmentCard)
                )}
            </section>

            <ConfirmDialog
                show={confirmDialogOpen}
                title="ביטול תור"
                message="האם לבטל את התור?"
                confirmLabel="כן, בטלו את התור"
                cancelLabel="חזרה"
                onConfirm={handleConfirmCancel}
                onCancel={() => setConfirmDialogOpen(false)}
            />

            {reviewTargetId && (
                <ReviewModal appointmentId={reviewTargetId} onClose={() => setReviewTargetId(null)} />
            )}
        </div>
    );
};

export default MyAppointments;
