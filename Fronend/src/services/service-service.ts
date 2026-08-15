import apiClient from "./api-client";
import { Service } from "../types/service";
import { ApiItemResponse, ApiListResponse } from "../types/api";

export interface CreateServiceData {
    business: string;
    name: string;
    description?: string;
    price: number;
    durationMinutes: number;
}

// No query params - the backend decides isActive filtering itself based on
// whether the caller is the owner/admin or a guest.
const list = (businessId: string) => {
    const abortController = new AbortController();
    const request = apiClient.get<ApiListResponse<Service>>(`/services/business/${businessId}`, {
        signal: abortController.signal,
    });
    return { request, abort: () => abortController.abort() };
};

const create = (data: CreateServiceData) => apiClient.post<ApiItemResponse<Service>>("/services", data);

// isActive is accepted here too - there is no separate reactivate route, so
// { isActive: true } through this same update endpoint is how a previously
// deactivated service is turned back on.
const update = (id: string, data: Partial<Omit<CreateServiceData, "business">> & { isActive?: boolean }) =>
    apiClient.put<ApiItemResponse<Service>>(`/services/${id}`, data);

// Soft delete only - sets isActive:false, never removes the document.
const deactivate = (id: string) => apiClient.delete<ApiItemResponse<Service>>(`/services/${id}`);

export default { list, create, update, deactivate };
