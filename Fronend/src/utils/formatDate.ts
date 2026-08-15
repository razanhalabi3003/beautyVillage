// Plain date (no time) - used by the admin lists (businesses/users/reviews)
// where only the creation day matters, unlike appointmentStatus.ts's
// formatAppointmentDateTime which needs the exact time too.
export const formatDate = (value: string): string =>
    new Date(value).toLocaleDateString("he-IL", { timeZone: "Asia/Jerusalem", dateStyle: "medium" });
