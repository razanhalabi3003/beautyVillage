import apiClient from "./api-client";
import { User } from "../types/user";
import { ApiItemResponse, ApiListResponse } from "../types/api";

const list = (page = 1, limit = 20) => {
    const abortController = new AbortController();
    const request = apiClient.get<ApiListResponse<User>>("/users", {
        params: { page, limit },
        signal: abortController.signal,
    });
    return { request, abort: () => abortController.abort() };
};

const getById = (id: string) => apiClient.get<ApiItemResponse<User>>(`/users/${id}`);

const updateProfile = (id: string, data: Partial<Pick<User, "name" | "phone" | "avatar">>) =>
    apiClient.put<ApiItemResponse<User>>(`/users/${id}`, data);

const updateStatus = (id: string, isActive: boolean) =>
    apiClient.put<ApiItemResponse<User>>(`/users/${id}/status`, { isActive });

export default { list, getById, updateProfile, updateStatus };
