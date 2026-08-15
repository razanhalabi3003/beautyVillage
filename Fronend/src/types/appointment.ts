import { User } from "./user";
import { Business } from "./business";
import { Service } from "./service";

export type AppointmentStatus = "pending" | "confirmed" | "completed" | "cancelled" | "rejected";

export interface Appointment {
    _id: string;
    // "phone" is only actually populated on the business-owner listing
    // (GET /appointments/business/:id) - absent there would be a silent gap,
    // same class of issue as the Stage 11 missing service.price fix.
    customer: string | Pick<User, "_id" | "name" | "phone">;
    business: string | Pick<Business, "_id" | "name">;
    service: string | Pick<Service, "_id" | "name" | "price" | "durationMinutes">;
    startDateTime: string;
    endDateTime: string;
    status: AppointmentStatus;
    customerNote?: string;
    cancellationReason?: string;
    createdAt: string;
    updatedAt: string;
}
