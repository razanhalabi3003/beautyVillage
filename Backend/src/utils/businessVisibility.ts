import { UserRole } from "../types/express";

interface VisibilityBusiness {
    approvalStatus: string;
    isActive: boolean;
    owner: { toString(): string };
}

interface VisibilityUser {
    id: string;
    role: UserRole;
}

// Same rule everywhere a business's private data might be exposed:
// approved+active is public to everyone; otherwise only the business's own
// owner or an admin may see it.
export const canViewBusiness = (business: VisibilityBusiness, user?: VisibilityUser): boolean => {
    const isPublic = business.approvalStatus === "approved" && business.isActive === true;
    if (isPublic) {
        return true;
    }
    if (!user) {
        return false;
    }
    const isOwner = business.owner.toString() === user.id;
    const isAdmin = user.role === "admin";
    return isOwner || isAdmin;
};
