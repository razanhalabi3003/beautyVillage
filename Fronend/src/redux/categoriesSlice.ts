import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import categoryService from "../services/category-service";
import { Category } from "../types/category";
import { getApiErrorMessage } from "../utils/apiError";

type Status = "idle" | "loading" | "succeeded" | "failed";

interface CategoriesState {
    items: Category[];
    // Separate from `items` (the public active-only cache, used by every
    // category dropdown app-wide) - GET /categories returns active+inactive
    // for an authenticated admin, and mixing that into `items` would leak
    // inactive categories into customer-facing dropdowns depending on fetch
    // order. Same reasoning as businessesSlice.adminList.
    adminList: Category[];
    status: Status;
    error: string | null;
}

const initialState: CategoriesState = { items: [], adminList: [], status: "idle", error: null };

export const fetchCategories = createAsyncThunk("categories/fetchAll", async () => {
    const { request } = categoryService.list();
    const response = await request;
    return response.data.data;
});

// Same GET /categories endpoint as fetchCategories above - the backend
// itself returns active+inactive when the caller is an authenticated admin,
// so this is only a different Redux destination, not a different request.
export const fetchAdminCategories = createAsyncThunk("categories/fetchForAdmin", async () => {
    const { request } = categoryService.list();
    const response = await request;
    return response.data.data;
});

export const createCategory = createAsyncThunk(
    "categories/create",
    async ({ name, image }: { name: string; image?: string }, { rejectWithValue }) => {
        try {
            const response = await categoryService.create(name, image);
            return response.data.data;
        } catch (error) {
            return rejectWithValue(getApiErrorMessage(error, "אירעה שגיאה ביצירת הקטגוריה"));
        }
    }
);

export const updateCategory = createAsyncThunk(
    "categories/update",
    async (
        { id, data }: { id: string; data: Partial<Pick<Category, "name" | "image">> & { isActive?: boolean } },
        { rejectWithValue }
    ) => {
        try {
            const response = await categoryService.update(id, data);
            return response.data.data;
        } catch (error) {
            return rejectWithValue(getApiErrorMessage(error, "אירעה שגיאה בעדכון הקטגוריה"));
        }
    }
);

export const deactivateCategory = createAsyncThunk(
    "categories/deactivate",
    async (id: string, { rejectWithValue }) => {
        try {
            const response = await categoryService.deactivate(id);
            return response.data.data;
        } catch (error) {
            return rejectWithValue(getApiErrorMessage(error, "אירעה שגיאה בהשבתת הקטגוריה"));
        }
    }
);

const upsertInAdminList = (state: CategoriesState, updated: Category) => {
    const index = state.adminList.findIndex((category) => category._id === updated._id);
    if (index !== -1) {
        state.adminList[index] = updated;
    } else {
        state.adminList.push(updated);
    }
};

const categoriesSlice = createSlice({
    name: "categories",
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchCategories.pending, (state) => {
                state.status = "loading";
                state.error = null;
            })
            .addCase(fetchCategories.fulfilled, (state, action) => {
                state.status = "succeeded";
                state.items = action.payload;
            })
            .addCase(fetchCategories.rejected, (state, action) => {
                state.status = "failed";
                state.error = action.error.message ?? "Failed to load categories";
            })
            .addCase(fetchAdminCategories.pending, (state) => {
                state.status = "loading";
                state.error = null;
            })
            .addCase(fetchAdminCategories.fulfilled, (state, action) => {
                state.status = "succeeded";
                state.adminList = action.payload;
            })
            .addCase(fetchAdminCategories.rejected, (state, action) => {
                state.status = "failed";
                state.error = action.error.message ?? "Failed to load categories";
            })
            .addCase(createCategory.fulfilled, (state, action) => {
                state.adminList.unshift(action.payload);
            })
            .addCase(updateCategory.fulfilled, (state, action) => {
                upsertInAdminList(state, action.payload);
            })
            .addCase(deactivateCategory.fulfilled, (state, action) => {
                upsertInAdminList(state, action.payload);
            });
    },
});

export default categoriesSlice.reducer;
