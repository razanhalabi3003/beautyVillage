import axios, { AxiosError, InternalAxiosRequestConfig, CanceledError } from "axios";
import {
    getAccessToken,
    getRefreshToken,
    setTokens,
    clearTokens,
    triggerForceLogout,
} from "./token-store";
import { RefreshResponse } from "../types/auth";

export { CanceledError };

// The single axios instance used by every service file. The dev fallback
// lives here only - individual services never hardcode a host.
const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

// Exposed for media-service.ts, which needs to build plain <img src> URLs
// (GET /media/:id) rather than axios calls - the browser fetches those
// directly, they are never routed through Redux or component state.
export const API_BASE_URL = BASE_URL;

const apiClient = axios.create({
    baseURL: BASE_URL,
});

// Auth endpoints must never trigger a refresh-and-retry off their own
// failure - a failing login/register/refresh call would otherwise try to
// recursively refresh itself.
const AUTH_ENDPOINTS = ["/auth/login", "/auth/register", "/auth/refresh"];

apiClient.interceptors.request.use((config) => {
    const token = getAccessToken();
    if (token) {
        config.headers.set("Authorization", "JWT " + token);
    }
    return config;
});

interface RetryableConfig extends InternalAxiosRequestConfig {
    _retry?: boolean;
}

// Only one /auth/refresh call is ever in flight - concurrent 401s queue
// behind this same promise instead of each firing their own refresh.
let refreshPromise: Promise<string> | null = null;

// authMiddleware sends a plain string body on an auth failure ("invalid
// token", "missing token", "account is suspended"). authorize()'s
// role-check 403 sends the {success:false,message:"Forbidden"} JSON
// envelope instead - that means "valid token, wrong role", and must never
// trigger a refresh attempt.
const isAuthTokenError = (error: AxiosError): boolean => {
    const status = error.response?.status;
    if (status !== 401 && status !== 403) {
        return false;
    }
    return typeof error.response?.data === "string";
};

const performRefresh = async (): Promise<string> => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
        throw new Error("No refresh token available");
    }
    const response = await axios.post<RefreshResponse>(`${BASE_URL}/auth/refresh`, { refreshToken });
    setTokens(response.data.accessToken, response.data.refreshToken);
    return response.data.accessToken;
};

// Exposed so AuthContext's boot-time session restore can reuse the exact
// same refresh call (and the same in-flight dedup below) instead of
// duplicating the POST /auth/refresh logic.
export const refreshAccessToken = (): Promise<string> => {
    if (!refreshPromise) {
        refreshPromise = performRefresh().finally(() => {
            refreshPromise = null;
        });
    }
    return refreshPromise;
};

apiClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const config = error.config as RetryableConfig | undefined;

        if (!config || !isAuthTokenError(error) || config._retry) {
            return Promise.reject(error);
        }
        if (AUTH_ENDPOINTS.some((endpoint) => config.url?.includes(endpoint))) {
            return Promise.reject(error);
        }

        config._retry = true;

        try {
            const newAccessToken = await refreshAccessToken();
            config.headers.set("Authorization", "JWT " + newAccessToken);
            return apiClient(config);
        } catch (refreshError) {
            clearTokens();
            triggerForceLogout();
            return Promise.reject(refreshError);
        }
    }
);

export default apiClient;
