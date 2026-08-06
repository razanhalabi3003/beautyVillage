export type UserRole = "customer" | "businessOwner" | "admin";

declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                role: UserRole;
            };
        }
    }
}

export {};
