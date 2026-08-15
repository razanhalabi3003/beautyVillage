import apiClient from "./api-client";
import { LoginResponse, RegisterResponse } from "../types/auth";
import { User } from "../types/user";

const register = (name: string, email: string, password: string) =>
    apiClient.post<RegisterResponse>("/auth/register", { name, email, password });

const login = (email: string, password: string) =>
    apiClient.post<LoginResponse>("/auth/login", { email, password });

const logout = (refreshToken: string) => apiClient.post<string>("/auth/logout", { refreshToken });

const me = () => apiClient.get<User>("/auth/me");

export default { register, login, logout, me };
