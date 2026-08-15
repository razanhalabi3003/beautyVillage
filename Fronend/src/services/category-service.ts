import apiClient from "./api-client";
import { Category } from "../types/category";
import { ApiItemResponse, ApiListResponse } from "../types/api";

// GET /categories has no query params - it always returns every active
// category, unpaginated.
const list = () => {
    const abortController = new AbortController();
    const request = apiClient.get<ApiListResponse<Category>>("/categories", {
        signal: abortController.signal,
    });
    return { request, abort: () => abortController.abort() };
};

const create = (name: string, image?: string) =>
    apiClient.post<ApiItemResponse<Category>>("/categories", { name, image });

// isActive is accepted here too - there is no separate reactivate route, so
// { isActive: true } through this same update endpoint is how a previously
// deactivated category is turned back on (same pattern as service
// reactivation in Stage 12).
const update = (id: string, data: Partial<Pick<Category, "name" | "image">> & { isActive?: boolean }) =>
    apiClient.put<ApiItemResponse<Category>>(`/categories/${id}`, data);

// Soft delete only - sets isActive:false, never removes the document.
const deactivate = (id: string) => apiClient.delete<ApiItemResponse<Category>>(`/categories/${id}`);

export default { list, create, update, deactivate };
