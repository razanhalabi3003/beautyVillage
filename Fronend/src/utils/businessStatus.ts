import { Business } from "../types/business";

// Shared between DashboardLayout, DashboardOverview and DashboardBusiness.
export const approvalStatusLabels: Record<Business["approvalStatus"], string> = {
    pending: "ממתין לאישור",
    approved: "מאושר",
    rejected: "נדחה",
};

export const approvalStatusColors: Record<Business["approvalStatus"], string> = {
    pending: "var(--bv-warning)",
    approved: "var(--bv-success)",
    rejected: "var(--bv-danger)",
};

// The realistic "suspended" state: an otherwise-approved business the admin
// has deactivated. isActive can technically be false on a pending/rejected
// business too, but that combination is never produced by the real
// approve/reject/suspend flows, so it isn't treated as "suspended" here.
export const isSuspended = (business: Business): boolean =>
    business.approvalStatus === "approved" && business.isActive === false;
