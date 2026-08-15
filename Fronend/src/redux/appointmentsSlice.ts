import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import appointmentService, { AppointmentQuery, CreateAppointmentData } from "../services/appointment-service";
import { Appointment } from "../types/appointment";
import { getApiErrorMessage } from "../utils/apiError";

type Status = "idle" | "loading" | "succeeded" | "failed";

interface AppointmentsState {
    mine: Appointment[];
    businessAppointments: Appointment[];
    status: Status;
    error: string | null;
}

const initialState: AppointmentsState = {
    mine: [],
    businessAppointments: [],
    status: "idle",
    error: null,
};

export const fetchMyAppointments = createAsyncThunk(
    "appointments/fetchMine",
    async (params: AppointmentQuery = {}) => {
        const { request } = appointmentService.getMine(params);
        const response = await request;
        return response.data.data;
    }
);

export const fetchBusinessAppointments = createAsyncThunk(
    "appointments/fetchForBusiness",
    async ({ businessId, params }: { businessId: string; params?: AppointmentQuery }) => {
        const { request } = appointmentService.getBusinessAppointments(businessId, params);
        const response = await request;
        return response.data.data;
    }
);

export const createAppointment = createAsyncThunk(
    "appointments/create",
    async (data: CreateAppointmentData, { rejectWithValue }) => {
        try {
            const response = await appointmentService.create(data);
            return response.data.data;
        } catch (error) {
            return rejectWithValue(getApiErrorMessage(error, "אירעה שגיאה בקביעת התור"));
        }
    }
);

export const cancelAppointment = createAsyncThunk(
    "appointments/cancel",
    async ({ id, cancellationReason }: { id: string; cancellationReason?: string }, { rejectWithValue }) => {
        try {
            const response = await appointmentService.cancel(id, cancellationReason);
            return response.data.data;
        } catch (error) {
            return rejectWithValue(getApiErrorMessage(error, "אירעה שגיאה בביטול התור"));
        }
    }
);

export const updateAppointmentStatus = createAsyncThunk(
    "appointments/updateStatus",
    async (
        { id, status }: { id: string; status: "confirmed" | "rejected" | "completed" },
        { rejectWithValue }
    ) => {
        try {
            const response = await appointmentService.updateStatus(id, status);
            return response.data.data;
        } catch (error) {
            return rejectWithValue(getApiErrorMessage(error, "אירעה שגיאה בעדכון סטטוס התור"));
        }
    }
);

const upsertAppointment = (list: Appointment[], updated: Appointment) => {
    const index = list.findIndex((appointment) => appointment._id === updated._id);
    if (index !== -1) {
        list[index] = updated;
    }
};

const appointmentsSlice = createSlice({
    name: "appointments",
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchMyAppointments.pending, (state) => {
                state.status = "loading";
                state.error = null;
            })
            .addCase(fetchMyAppointments.fulfilled, (state, action) => {
                state.status = "succeeded";
                state.mine = action.payload;
            })
            .addCase(fetchMyAppointments.rejected, (state, action) => {
                state.status = "failed";
                state.error = action.error.message ?? "Failed to load appointments";
            })
            .addCase(fetchBusinessAppointments.pending, (state) => {
                state.status = "loading";
                state.error = null;
            })
            .addCase(fetchBusinessAppointments.fulfilled, (state, action) => {
                state.status = "succeeded";
                state.businessAppointments = action.payload;
            })
            .addCase(fetchBusinessAppointments.rejected, (state, action) => {
                state.status = "failed";
                state.error = action.error.message ?? "Failed to load business appointments";
            })
            .addCase(cancelAppointment.fulfilled, (state, action) => {
                upsertAppointment(state.mine, action.payload);
                upsertAppointment(state.businessAppointments, action.payload);
            })
            .addCase(updateAppointmentStatus.fulfilled, (state, action) => {
                upsertAppointment(state.mine, action.payload);
                upsertAppointment(state.businessAppointments, action.payload);
            });
    },
});

export default appointmentsSlice.reducer;
