// Plain, React-free token storage - shared by api-client.ts (the Axios
// interceptors) and AuthContext, without either one importing the other.
//
// accessToken lives in memory only (lost on a hard refresh, re-derived from
// the refresh token on the next app boot). refreshToken is persisted in
// localStorage - this backend has no cookie support (POST /auth/refresh
// only ever reads req.body.refreshToken), so localStorage is the only
// channel available for surviving a real page reload. A deliberate,
// documented tradeoff for a student project, not an oversight.

const REFRESH_TOKEN_KEY = "refreshToken";

let accessToken: string | null = null;

export const getAccessToken = (): string | null => accessToken;

export const setAccessToken = (token: string | null): void => {
    accessToken = token;
};

export const getRefreshToken = (): string | null => localStorage.getItem(REFRESH_TOKEN_KEY);

export const setRefreshToken = (token: string | null): void => {
    if (token) {
        localStorage.setItem(REFRESH_TOKEN_KEY, token);
    } else {
        localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
};

// Refresh rotation: the backend invalidates the old refresh token and
// issues a new access+refresh pair on every /auth/refresh call. Both must
// always be persisted together, or the next refresh attempt fails.
export const setTokens = (newAccessToken: string, newRefreshToken: string): void => {
    setAccessToken(newAccessToken);
    setRefreshToken(newRefreshToken);
};

export const clearTokens = (): void => {
    setAccessToken(null);
    setRefreshToken(null);
};

// api-client.ts calls this when a refresh attempt fails, so AuthContext can
// reset its state and let the route guards redirect - without api-client.ts
// importing React or the context module.
let onForceLogout: (() => void) | null = null;

export const registerForceLogout = (handler: () => void): void => {
    onForceLogout = handler;
};

export const triggerForceLogout = (): void => {
    onForceLogout?.();
};
