import { User } from "./user";
import { Business } from "./business";

export interface Review {
    _id: string;
    customer: string | Pick<User, "_id" | "name" | "avatar">;
    // Populated with name only on the admin moderation listing
    // (GET /reviews/admin) - a plain id everywhere else.
    business: string | Pick<Business, "_id" | "name">;
    appointment: string;
    rating: 1 | 2 | 3 | 4 | 5;
    comment?: string;
    isVisible: boolean;
    createdAt: string;
    updatedAt: string;
}
