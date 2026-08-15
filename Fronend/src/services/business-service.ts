import apiClient from "./api-client";
import { Business, WorkingHour } from "../types/business";
import { MediaMeta } from "../types/media";
import { ApiItemResponse, ApiListResponse } from "../types/api";

export interface BusinessListParams {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    sort?: "rating";
}

export interface AdminBusinessListParams {
    page?: number;
    limit?: number;
    status?: "pending" | "approved" | "rejected";
}

export interface CreateBusinessData {
    name: string;
    description: string;
    category: string;
    address: string;
    phone: string;
    workingHours: WorkingHour[];
}

const list = (params: BusinessListParams = {}) => {
    const abortController = new AbortController();
    const request = apiClient.get<ApiListResponse<Business>>("/businesses", {
        params,
        signal: abortController.signal,
    });
    return { request, abort: () => abortController.abort() };
};

// Returns data:null when the current user has no business yet - a normal
// state, not an error.
const getMine = () => apiClient.get<ApiItemResponse<Business | null>>("/businesses/mine");

const getPending = (page = 1, limit = 12) => {
    const abortController = new AbortController();
    const request = apiClient.get<ApiListResponse<Business>>("/businesses/pending", {
        params: { page, limit },
        signal: abortController.signal,
    });
    return { request, abort: () => abortController.abort() };
};

// General-purpose admin listing (any/all approvalStatus), separate from
// getPending above - used by the admin businesses page's pending/approved/
// rejected tabs alike, for one consistent code path.
const listForAdmin = (params: AdminBusinessListParams = {}) => {
    const abortController = new AbortController();
    const request = apiClient.get<ApiListResponse<Business>>("/businesses/admin", {
        params,
        signal: abortController.signal,
    });
    return { request, abort: () => abortController.abort() };
};

const getById = (id: string) => {
    const abortController = new AbortController();
    const request = apiClient.get<ApiItemResponse<Business>>(`/businesses/${id}`, {
        signal: abortController.signal,
    });
    return { request, abort: () => abortController.abort() };
};

const create = (data: CreateBusinessData) => apiClient.post<ApiItemResponse<Business>>("/businesses", data);

const update = (id: string, data: Partial<CreateBusinessData>) =>
    apiClient.put<ApiItemResponse<Business>>(`/businesses/${id}`, data);

const approve = (id: string) => apiClient.put<ApiItemResponse<Business>>(`/businesses/${id}/approve`);

const reject = (id: string, rejectionReason: string) =>
    apiClient.put<ApiItemResponse<Business>>(`/businesses/${id}/reject`, { rejectionReason });

const suspend = (id: string, isActive: boolean) =>
    apiClient.put<ApiItemResponse<Business>>(`/businesses/${id}/suspend`, { isActive });

const uploadMedia = (
    id: string,
    kind: "logo" | "cover" | "portfolio",
    file: File,
    onUploadProgress?: (percent: number) => void
) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient.post<ApiItemResponse<MediaMeta>>(`/businesses/${id}/${kind}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: onUploadProgress
            ? (event) => {
                  if (event.total) {
                      onUploadProgress(Math.round((event.loaded / event.total) * 100));
                  }
              }
            : undefined,
    });
};

const deletePortfolioImage = (id: string, mediaId: string) =>
    apiClient.delete<ApiItemResponse<{ deleted: true }>>(`/businesses/${id}/portfolio/${mediaId}`);

export default {
    list,
    getMine,
    getPending,
    listForAdmin,
    getById,
    create,
    update,
    approve,
    reject,
    suspend,
    uploadMedia,
    deletePortfolioImage,
};
