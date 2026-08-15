import { createContext, useCallback, useEffect, useMemo, useReducer, ReactNode } from "react";
import { User } from "../types/user";
import authService from "../services/auth-service";
import { getRefreshToken, setTokens, clearTokens, registerForceLogout } from "../services/token-store";
import { refreshAccessToken } from "../services/api-client";

interface AuthState {
    user: User | null;
    isLoading: boolean;
}

type AuthAction = { type: "SET_LOADING"; payload: boolean } | { type: "SET_USER"; payload: User | null };

const initialState: AuthState = { user: null, isLoading: true };

function authReducer(state: AuthState, action: AuthAction): AuthState {
    switch (action.type) {
        case "SET_LOADING":
            return { ...state, isLoading: action.payload };
        case "SET_USER":
            return { ...state, user: action.payload };
        default:
            return state;
    }
}

export interface AuthContextValue {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (name: string, email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [state, dispatch] = useReducer(authReducer, initialState);

    const login = useCallback(async (email: string, password: string) => {
        const response = await authService.login(email, password);
        setTokens(response.data.accessToken, response.data.refreshToken);
        const { data: user } = await authService.me();
        dispatch({ type: "SET_USER", payload: user });
    }, []);

    const register = useCallback(
        async (name: string, email: string, password: string) => {
            await authService.register(name, email, password);
            // /auth/register issues no tokens - log in immediately afterward
            // so registration feels like one continuous action to the user.
            await login(email, password);
        },
        [login]
    );

    const logout = useCallback(async () => {
        const refreshToken = getRefreshToken();
        clearTokens();
        dispatch({ type: "SET_USER", payload: null });
        if (refreshToken) {
            try {
                await authService.logout(refreshToken);
            } catch {
                // Already logged out locally - a failed server-side revoke
                // (e.g. a network hiccup) shouldn't block the user from leaving.
            }
        }
    }, []);

    // api-client.ts's response interceptor calls this when a refresh attempt
    // fails, so this context can reset without api-client.ts importing React.
    useEffect(() => {
        registerForceLogout(() => dispatch({ type: "SET_USER", payload: null }));
    }, []);

    // Boot-time session restore: a refresh token surviving in localStorage is
    // the only signal of a previous session (the access token lives in
    // memory only and is always gone after a hard reload).
    useEffect(() => {
        const restoreSession = async () => {
            if (!getRefreshToken()) {
                dispatch({ type: "SET_LOADING", payload: false });
                return;
            }
            try {
                await refreshAccessToken();
                const { data: user } = await authService.me();
                dispatch({ type: "SET_USER", payload: user });
            } catch {
                clearTokens();
                dispatch({ type: "SET_USER", payload: null });
            } finally {
                dispatch({ type: "SET_LOADING", payload: false });
            }
        };
        restoreSession();
    }, []);

    const value = useMemo<AuthContextValue>(
        () => ({
            user: state.user,
            isAuthenticated: state.user !== null,
            isLoading: state.isLoading,
            login,
            register,
            logout,
        }),
        [state.user, state.isLoading, login, register, logout]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
