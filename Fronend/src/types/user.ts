export type UserRole = "customer" | "businessOwner" | "admin";

export interface User {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    avatar?: string;
    role: UserRole;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}
