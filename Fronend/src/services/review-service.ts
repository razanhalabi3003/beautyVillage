import apiClient from "./api-client";
import { Review } from "../types/review";
import { ApiItemResponse, ApiListResponse } from "../types/api";

export interface CreateReviewData {
    appointment: string;
    rating: 1 | 2 | 3 | 4 | 5;
    comment?: string;
}

const listByBusiness = (businessId: string, page = 1, limit = 20) => {
    const abortController = new AbortController();
    const request = apiClient.get<ApiListResponse<Review>>(`/reviews/business/${businessId}`, {
        params: { page, limit },
        signal: abortController.signal,
    });
    return { request, abort: () => abortController.abort() };
};

const create = (data: CreateReviewData) => apiClient.post<ApiItemResponse<Review>>("/reviews", data);

// The current user's own reviews, regardless of isVisible - used to reliably
// know which completed appointments already have a review (a hidden review
// still counts as "already reviewed", unlike the public business listing).
const listMine = () => {
    const abortController = new AbortController();
    const request = apiClient.get<ApiListResponse<Review>>("/reviews/mine", {
        signal: abortController.signal,
    });
    return { request, abort: () => abortController.abort() };
};

const updateVisibility = (id: string, isVisible: boolean) =>
    apiClient.put<ApiItemResponse<Review>>(`/reviews/${id}/visibility`, { isVisible });

const listForAdmin = (page = 1, limit = 20, isVisible?: boolean) => {
    const abortController = new AbortController();
    const request = apiClient.get<ApiListResponse<Review>>("/reviews/admin", {
        params: { page, limit, isVisible },
        signal: abortController.signal,
    });
    return { request, abort: () => abortController.abort() };
};

export default { listByBusiness, create, listMine, updateVisibility, listForAdmin };
