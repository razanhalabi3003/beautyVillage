import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import businessService, { AdminBusinessListParams, BusinessListParams, CreateBusinessData } from "../services/business-service";
import { Business } from "../types/business";
import { Pagination } from "../types/api";
import { getApiErrorMessage } from "../utils/apiError";

type Status = "idle" | "loading" | "succeeded" | "failed";

interface BusinessesState {
    items: Business[];
    pagination: Pagination | null;
    currentBusiness: Business | null;
    mine: Business | null;
    // Separate from `items` (the public approved-only cache) - the admin
    // listing can include every approvalStatus, so mixing them would leak
    // pending/rejected/suspended businesses into public-facing pages.
    adminList: Business[];
    adminPagination: Pagination | null;
    status: Status;
    error: string | null;
}

const initialState: BusinessesState = {
    items: [],
    pagination: null,
    currentBusiness: null,
    mine: null,
    adminList: [],
    adminPagination: null,
    status: "idle",
    error: null,
};

export const fetchBusinesses = createAsyncThunk(
    "businesses/fetchAll",
    async (params: BusinessListParams = {}) => {
        const { request } = businessService.list(params);
        const response = await request;
        return response.data;
    }
);

export const fetchBusinessById = createAsyncThunk("businesses/fetchById", async (id: string) => {
    const { request } = businessService.getById(id);
    const response = await request;
    return response.data.data;
});

// The current user's own business (businessOwner dashboard) - data:null is a
// normal state (no business yet), not an error.
export const fetchMyBusiness = createAsyncThunk("businesses/fetchMine", async () => {
    const response = await businessService.getMine();
    return response.data.data;
});

export const updateMyBusiness = createAsyncThunk(
    "businesses/updateMine",
    async ({ id, data }: { id: string; data: Partial<CreateBusinessData> }, { rejectWithValue }) => {
        try {
            const response = await businessService.update(id, data);
            return response.data.data;
        } catch (error) {
            return rejectWithValue(getApiErrorMessage(error, "אירעה שגיאה בעדכון פרטי העסק"));
        }
    }
);

// The initial business submission (SubmitBusiness, no-business state). The
// backend rejects a second submission per owner (unique index + an explicit
// pre-check), so this is only ever dispatched when state.mine is null.
export const createMyBusiness = createAsyncThunk(
    "businesses/createMine",
    async (data: CreateBusinessData, { rejectWithValue }) => {
        try {
            const response = await businessService.create(data);
            return response.data.data;
        } catch (error) {
            return rejectWithValue(getApiErrorMessage(error, "אירעה שגיאה בשליחת הבקשה"));
        }
    }
);

export const fetchAdminBusinesses = createAsyncThunk(
    "businesses/fetchForAdmin",
    async (params: AdminBusinessListParams = {}) => {
        const { request } = businessService.listForAdmin(params);
        const response = await request;
        return response.data;
    }
);

export const approveBusiness = createAsyncThunk(
    "businesses/approve",
    async (id: string, { rejectWithValue }) => {
        try {
            const response = await businessService.approve(id);
            return response.data.data;
        } catch (error) {
            return rejectWithValue(getApiErrorMessage(error, "אירעה שגיאה באישור העסק"));
        }
    }
);

export const rejectBusiness = createAsyncThunk(
    "businesses/reject",
    async ({ id, rejectionReason }: { id: string; rejectionReason: string }, { rejectWithValue }) => {
        try {
            const response = await businessService.reject(id, rejectionReason);
            return response.data.data;
        } catch (error) {
            return rejectWithValue(getApiErrorMessage(error, "אירעה שגיאה בדחיית העסק"));
        }
    }
);

export const suspendBusiness = createAsyncThunk(
    "businesses/suspend",
    async ({ id, isActive }: { id: string; isActive: boolean }, { rejectWithValue }) => {
        try {
            const response = await businessService.suspend(id, isActive);
            return response.data.data;
        } catch (error) {
            return rejectWithValue(getApiErrorMessage(error, "אירעה שגיאה בעדכון סטטוס העסק"));
        }
    }
);

// approve/reject/suspend return the raw (unpopulated) business document, not
// the owner/category-populated shape the admin list itself uses - patching
// only the fields these actions actually change keeps the already-populated
// owner/category in the list item instead of overwriting them with bare ids.
const patchInAdminList = (state: BusinessesState, updated: Business) => {
    const existing = state.adminList.find((business) => business._id === updated._id);
    if (existing) {
        existing.approvalStatus = updated.approvalStatus;
        existing.isActive = updated.isActive;
        existing.rejectionReason = updated.rejectionReason;
    }
};

const businessesSlice = createSlice({
    name: "businesses",
    initialState,
    reducers: {
        clearCurrentBusiness: (state) => {
            state.currentBusiness = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchBusinesses.pending, (state) => {
                state.status = "loading";
                state.error = null;
            })
            .addCase(fetchBusinesses.fulfilled, (state, action) => {
                state.status = "succeeded";
                state.items = action.payload.data;
                state.pagination = action.payload.pagination;
            })
            .addCase(fetchBusinesses.rejected, (state, action) => {
                state.status = "failed";
                state.error = action.error.message ?? "Failed to load businesses";
            })
            .addCase(fetchBusinessById.pending, (state) => {
                state.status = "loading";
                state.error = null;
            })
            .addCase(fetchBusinessById.fulfilled, (state, action) => {
                state.status = "succeeded";
                state.currentBusiness = action.payload;
            })
            .addCase(fetchBusinessById.rejected, (state, action) => {
                state.status = "failed";
                state.error = action.error.message ?? "Failed to load business";
            })
            .addCase(fetchMyBusiness.pending, (state) => {
                state.status = "loading";
                state.error = null;
            })
            .addCase(fetchMyBusiness.fulfilled, (state, action) => {
                state.status = "succeeded";
                state.mine = action.payload;
            })
            .addCase(fetchMyBusiness.rejected, (state, action) => {
                state.status = "failed";
                state.error = action.error.message ?? "Failed to load your business";
            })
            .addCase(updateMyBusiness.fulfilled, (state, action) => {
                state.mine = action.payload;
            })
            .addCase(createMyBusiness.fulfilled, (state, action) => {
                state.mine = action.payload;
            })
            .addCase(fetchAdminBusinesses.pending, (state) => {
                state.status = "loading";
                state.error = null;
            })
            .addCase(fetchAdminBusinesses.fulfilled, (state, action) => {
                state.status = "succeeded";
                state.adminList = action.payload.data;
                state.adminPagination = action.payload.pagination;
            })
            .addCase(fetchAdminBusinesses.rejected, (state, action) => {
                state.status = "failed";
                state.error = action.error.message ?? "Failed to load businesses";
            })
            .addCase(approveBusiness.fulfilled, (state, action) => {
                patchInAdminList(state, action.payload);
            })
            .addCase(rejectBusiness.fulfilled, (state, action) => {
                patchInAdminList(state, action.payload);
            })
            .addCase(suspendBusiness.fulfilled, (state, action) => {
                patchInAdminList(state, action.payload);
            });
    },
});

export const { clearCurrentBusiness } = businessesSlice.actions;
export default businessesSlice.reducer;
