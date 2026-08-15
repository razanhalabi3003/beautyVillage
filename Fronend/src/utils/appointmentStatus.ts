import { Appointment } from "../types/appointment";

// Shared between MyAppointments (customer view) and DashboardAppointments
// (business-owner view) - same status set, same Hebrew labels either way.
export const appointmentStatusLabels: Record<Appointment["status"], string> = {
    pending: "ממתין לאישור",
    confirmed: "מאושר",
    completed: "הושלם",
    cancelled: "בוטל",
    rejected: "נדחה",
};

export const appointmentStatusColors: Record<Appointment["status"], string> = {
    pending: "var(--bv-warning)",
    confirmed: "var(--bv-primary)",
    completed: "var(--bv-success)",
    cancelled: "var(--bv-text-muted)",
    rejected: "var(--bv-danger)",
};

export const formatAppointmentDateTime = (value: string): string =>
    new Date(value).toLocaleString("he-IL", { timeZone: "Asia/Jerusalem", dateStyle: "medium", timeStyle: "short" });
