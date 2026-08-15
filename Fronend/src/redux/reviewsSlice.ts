import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import reviewService, { CreateReviewData } from "../services/review-service";
import { Review } from "../types/review";
import { getApiErrorMessage } from "../utils/apiError";

type Status = "idle" | "loading" | "succeeded" | "failed";

interface ReviewsState {
    byBusiness: Record<string, Review[]>;
    adminList: Review[];
    mine: Review[];
    status: Status;
    error: string | null;
}

const initialState: ReviewsState = {
    byBusiness: {},
    adminList: [],
    mine: [],
    status: "idle",
    error: null,
};

export const fetchReviewsByBusiness = createAsyncThunk("reviews/fetchByBusiness", async (businessId: string) => {
    const { request } = reviewService.listByBusiness(businessId);
    const response = await request;
    return { businessId, reviews: response.data.data };
});

export const fetchAdminReviews = createAsyncThunk(
    "reviews/fetchForAdmin",
    async (params: { page?: number; limit?: number; isVisible?: boolean } = {}) => {
        const { request } = reviewService.listForAdmin(params.page, params.limit, params.isVisible);
        const response = await request;
        return response.data.data;
    }
);

// The current user's own reviews (including hidden ones) - used to build a
// reliable "already reviewed" set for MyAppointments.
export const fetchMyReviews = createAsyncThunk("reviews/fetchMine", async () => {
    const { request } = reviewService.listMine();
    const response = await request;
    return response.data.data;
});

export const createReview = createAsyncThunk(
    "reviews/create",
    async (data: CreateReviewData, { rejectWithValue }) => {
        try {
            const response = await reviewService.create(data);
            return response.data.data;
        } catch (error) {
            return rejectWithValue(getApiErrorMessage(error, "אירעה שגיאה בשליחת הביקורת"));
        }
    }
);

export const updateReviewVisibility = createAsyncThunk(
    "reviews/updateVisibility",
    async ({ id, isVisible }: { id: string; isVisible: boolean }) => {
        const response = await reviewService.updateVisibility(id, isVisible);
        return response.data.data;
    }
);

const replaceById = (list: Review[], updated: Review) => {
    const index = list.findIndex((review) => review._id === updated._id);
    if (index !== -1) {
        list[index] = updated;
    }
};

const reviewsSlice = createSlice({
    name: "reviews",
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchReviewsByBusiness.pending, (state) => {
                state.status = "loading";
                state.error = null;
            })
            .addCase(fetchReviewsByBusiness.fulfilled, (state, action) => {
                state.status = "succeeded";
                state.byBusiness[action.payload.businessId] = action.payload.reviews;
            })
            .addCase(fetchReviewsByBusiness.rejected, (state, action) => {
                state.status = "failed";
                state.error = action.error.message ?? "Failed to load reviews";
            })
            .addCase(fetchAdminReviews.pending, (state) => {
                state.status = "loading";
                state.error = null;
            })
            .addCase(fetchAdminReviews.fulfilled, (state, action) => {
                state.status = "succeeded";
                state.adminList = action.payload;
            })
            .addCase(fetchAdminReviews.rejected, (state, action) => {
                state.status = "failed";
                state.error = action.error.message ?? "Failed to load reviews";
            })
            .addCase(fetchMyReviews.pending, (state) => {
                state.status = "loading";
                state.error = null;
            })
            .addCase(fetchMyReviews.fulfilled, (state, action) => {
                state.status = "succeeded";
                state.mine = action.payload;
            })
            .addCase(fetchMyReviews.rejected, (state, action) => {
                state.status = "failed";
                state.error = action.error.message ?? "Failed to load your reviews";
            })
            .addCase(createReview.fulfilled, (state, action) => {
                // So MyAppointments' reviewed-set updates immediately without
                // a full refetch.
                state.mine.unshift(action.payload);
            })
            .addCase(updateReviewVisibility.fulfilled, (state, action) => {
                const updated = action.payload;
                // adminList's items came from the populated GET /reviews/admin
                // listing (customer.name, business.name), but this action's
                // own response is never populated - only patch isVisible so
                // the already-populated fields aren't overwritten with bare
                // ids (same pattern as businessesSlice's admin actions).
                const adminEntry = state.adminList.find((review) => review._id === updated._id);
                if (adminEntry) {
                    adminEntry.isVisible = updated.isVisible;
                }
                // state.mine's reviews are never populated in the first
                // place (listMine doesn't populate), so a full replace here
                // loses nothing.
                replaceById(state.mine, updated);
                // updateVisibility's response is never populated (unlike the
                // admin listing), so `business` is always a plain id here -
                // this just satisfies the type after Review.business became
                // a string | Pick<Business,...> union for the admin listing.
                const businessId = typeof updated.business === "string" ? updated.business : updated.business._id;
                // A hidden review disappears from the public cache; a
                // restored one isn't re-inserted here - the next
                // fetchReviewsByBusiness call picks it up correctly sorted.
                const cached = state.byBusiness[businessId];
                if (cached) {
                    state.byBusiness[businessId] = cached.filter(
                        (review) => review._id !== updated._id || updated.isVisible
                    );
                }
            });
    },
});

export default reviewsSlice.reducer;
