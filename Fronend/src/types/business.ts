import { Category } from "./category";
import { User } from "./user";

export type ApprovalStatus = "pending" | "approved" | "rejected";

export interface WorkingHour {
    day: number; // 0-6
    isOpen: boolean;
    startTime?: string;
    endTime?: string;
}

export interface Business {
    _id: string;
    // Populated with name+email on the admin listing (GET /businesses/admin
    // and GET /businesses/pending) - a plain id everywhere else, same
    // pattern as `category` below.
    owner: string | Pick<User, "_id" | "name" | "email">;
    name: string;
    description: string;
    category: string | Category;
    address: string;
    phone: string;
    workingHours: WorkingHour[];
    approvalStatus: ApprovalStatus;
    rejectionReason?: string;
    isActive: boolean;
    averageRating: number;
    reviewCount: number;
    createdAt: string;
    updatedAt: string;
}
