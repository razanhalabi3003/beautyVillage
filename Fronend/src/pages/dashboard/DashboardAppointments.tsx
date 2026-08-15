import { FC, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../redux/hooks";
import useAppointments from "../../custom_hooks/useAppointments";
import { updateAppointmentStatus, cancelAppointment } from "../../redux/appointmentsSlice";
import { Appointment, AppointmentStatus } from "../../types/appointment";
import LoadingSpinner from "../../Componnents/LoadingSpinner";
import ErrorMessage from "../../Componnents/ErrorMessage";
import EmptyState from "../../Componnents/EmptyState";
import ConfirmDialog from "../../Componnents/ConfirmDialog";
import { appointmentStatusLabels, appointmentStatusColors, formatAppointmentDateTime } from "../../utils/appointmentStatus";

const FILTER_OPTIONS: { value: AppointmentStatus | ""; label: string }[] = [
    { value: "", label: "כל הסטטוסים" },
    { value: "pending", label: appointmentStatusLabels.pending },
    { value: "confirmed", label: appointmentStatusLabels.confirmed },
    { value: "completed", label: appointmentStatusLabels.completed },
    { value: "cancelled", label: appointmentStatusLabels.cancelled },
    { value: "rejected", label: appointmentStatusLabels.rejected },
];

type PendingAction = { type: "reject" | "complete"; appointment: Appointment } | null;

// Business is guaranteed non-null here - DashboardLayout gates rendering of
// this whole route subtree until state.businesses.mine is loaded.
const DashboardAppointments: FC = () => {
    const dispatch = useAppDispatch();
    const business = useAppSelector((state) => state.businesses.mine)!;
    const [statusFilter, setStatusFilter] = useState<AppointmentStatus | "">("");
    const { appointments, isLoading, error } = useAppointments(
        { businessId: business._id },
        statusFilter ? { status: statusFilter } : {}
    );

    const [actionError, setActionError] = useState<string | null>(null);
    const [approvingId, setApprovingId] = useState<string | null>(null);

    const [pendingAction, setPendingAction] = useState<PendingAction>(null);
    const [isProcessingAction, setIsProcessingAction] = useState(false);

    const [cancelingId, setCancelingId] = useState<string | null>(null);
    const [cancelReason, setCancelReason] = useState("");
    const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);

    const handleApprove = async (id: string) => {
        setApprovingId(id);
        setActionError(null);
        try {
            await dispatch(updateAppointmentStatus({ id, status: "confirmed" })).unwrap();
        } catch (submitError) {
            setActionError(typeof submitError === "string" ? submitError : "אירעה שגיאה באישור התור");
        } finally {
            setApprovingId(null);
        }
    };

    const handleConfirmPendingAction = async () => {
        if (!pendingAction) {
            return;
        }
        setIsProcessingAction(true);
        setActionError(null);
        try {
            const status = pendingAction.type === "reject" ? "rejected" : "completed";
            await dispatch(updateAppointmentStatus({ id: pendingAction.appointment._id, status })).unwrap();
            setPendingAction(null);
        } catch (submitError) {
            setActionError(typeof submitError === "string" ? submitError : "אירעה שגיאה בעדכון התור");
        } finally {
            setIsProcessingAction(false);
        }
    };

    const startCancel = (id: string) => {
        setCancelingId(id);
        setCancelReason("");
        setActionError(null);
    };

    const handleConfirmCancel = async () => {
        if (!cancelingId) {
            return;
        }
        setIsCancelling(true);
        setActionError(null);
        try {
            await dispatch(
                cancelAppointment({ id: cancelingId, cancellationReason: cancelReason || undefined })
            ).unwrap();
            setCancelConfirmOpen(false);
            setCancelingId(null);
            setCancelReason("");
        } catch (submitError) {
            setCancelConfirmOpen(false);
            setActionError(typeof submitError === "string" ? submitError : "אירעה שגיאה בביטול התור");
        } finally {
            setIsCancelling(false);
        }
    };

    const renderAppointmentCard = (appointment: Appointment) => {
        const customerName = typeof appointment.customer === "string" ? "" : appointment.customer.name;
        const customerPhone = typeof appointment.customer === "string" ? undefined : appointment.customer.phone;
        const serviceName = typeof appointment.service === "string" ? "" : appointment.service.name;
        const isCanceling = cancelingId === appointment._id;
        const now = Date.now();
        const canCancel = appointment.status === "confirmed" && new Date(appointment.startDateTime).getTime() > now;
        const canComplete = appointment.status === "confirmed" && new Date(appointment.endDateTime).getTime() <= now;

        return (
            <div key={appointment._id} className="card p-3 mb-3">
                <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
                    <div>
                        <h3 className="h6 mb-1">{customerName}</h3>
                        {customerPhone && <p className="mb-1 small text-muted">{customerPhone}</p>}
                        <p className="mb-1 small text-muted">{serviceName}</p>
                        <p className="mb-1 small">{formatAppointmentDateTime(appointment.startDateTime)}</p>
                        {appointment.customerNote && (
                            <p className="mb-1 small text-muted">הערת לקוח: {appointment.customerNote}</p>
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

                <div className="d-flex gap-2 mt-2 flex-wrap">
                    {appointment.status === "pending" && (
                        <>
                            <button
                                type="button"
                                className="btn btn-sm btn-primary"
                                disabled={approvingId === appointment._id}
                                onClick={() => handleApprove(appointment._id)}
                            >
                                {approvingId === appointment._id ? "מאשר..." : "אישור"}
                            </button>
                            <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => setPendingAction({ type: "reject", appointment })}
                            >
                                דחייה
                            </button>
                        </>
                    )}
                    {canCancel && !isCanceling && (
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => startCancel(appointment._id)}
                        >
                            ביטול תור
                        </button>
                    )}
                    {canComplete && (
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-success"
                            onClick={() => setPendingAction({ type: "complete", appointment })}
                        >
                            סימון כהושלם
                        </button>
                    )}
                </div>

                {isCanceling && (
                    <div className="mt-3 pt-3 border-top">
                        <label className="form-label small" htmlFor={`owner-cancel-reason-${appointment._id}`}>
                            סיבת ביטול (אופציונלי)
                        </label>
                        <textarea
                            id={`owner-cancel-reason-${appointment._id}`}
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
                                onClick={() => setCancelConfirmOpen(true)}
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

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                <h2 className="h5 mb-0">ניהול תורים</h2>
                <select
                    className="form-select form-select-sm"
                    style={{ maxWidth: "220px" }}
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value as AppointmentStatus | "")}
                    aria-label="סינון לפי סטטוס"
                >
                    {FILTER_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </div>

            {actionError && (
                <div className="alert alert-danger" role="alert">
                    {actionError}
                </div>
            )}

            {isLoading && <LoadingSpinner />}
            {!isLoading && error && <ErrorMessage message={error} />}
            {!isLoading && !error && appointments.length === 0 && <EmptyState title="אין תורים להצגה" />}
            {!isLoading && !error && appointments.length > 0 && appointments.map(renderAppointmentCard)}

            <ConfirmDialog
                show={!!pendingAction}
                title={pendingAction?.type === "reject" ? "דחיית תור" : "סימון תור כהושלם"}
                message={
                    pendingAction?.type === "reject"
                        ? "האם לדחות את בקשת התור? הלקוח יקבל עדכון שהבקשה נדחתה."
                        : "לסמן את התור כהושלם?"
                }
                confirmLabel={isProcessingAction ? "מעדכן..." : "אישור"}
                onConfirm={handleConfirmPendingAction}
                onCancel={() => setPendingAction(null)}
            />

            <ConfirmDialog
                show={cancelConfirmOpen}
                title="ביטול תור"
                message="האם לבטל את התור? הלקוח יקבל עדכון שהתור בוטל."
                confirmLabel={isCancelling ? "מבטל..." : "כן, בטלו את התור"}
                cancelLabel="חזרה"
                onConfirm={handleConfirmCancel}
                onCancel={() => setCancelConfirmOpen(false)}
            />
        </div>
    );
};

export default DashboardAppointments;
