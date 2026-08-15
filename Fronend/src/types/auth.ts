import { UserRole } from "./user";

// /auth/login response - a raw body, not the {success,data} envelope.
export interface LoginResponse {
    _id: string;
    name: string;
    email: string;
    role: UserRole;
    accessToken: string;
    refreshToken: string;
}

// /auth/register response - note: no tokens are issued here.
export interface RegisterResponse {
    _id: string;
    name: string;
    email: string;
    role: UserRole;
}

// /auth/refresh response - both tokens are rotated on every call.
export interface RefreshResponse {
    accessToken: string;
    refreshToken: string;
}
