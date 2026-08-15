import { UserRole } from "../types/user";

// Shared between Profile (a user's own role) and AdminUsers (every user's
// role) - previously each page defined its own copy of the same 3 labels.
export const userRoleLabels: Record<UserRole, string> = {
    customer: "לקוח/ה",
    businessOwner: "בעל/ת עסק",
    admin: "מנהל/ת מערכת",
};
