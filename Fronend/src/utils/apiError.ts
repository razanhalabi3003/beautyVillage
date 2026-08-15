import axios from "axios";

// createAsyncThunk serializes a rejected promise into a generic
// {name,message,stack} by default, losing the backend's actual
// {success:false,message:...} body. Thunks that need to surface the real
// backend rejection (e.g. "This time slot is no longer available") should
// catch the raw error and pass this through rejectWithValue instead.
export const getApiErrorMessage = (error: unknown, fallback: string): string => {
    if (axios.isAxiosError(error)) {
        const data = error.response?.data as { message?: string } | undefined;
        if (data && typeof data.message === "string") {
            return data.message;
        }
    }
    return fallback;
};
