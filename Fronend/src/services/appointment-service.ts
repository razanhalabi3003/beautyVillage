import apiClient from "./api-client";
import { Appointment, AppointmentStatus } from "../types/appointment";
import { ApiItemResponse, ApiListResponse } from "../types/api";

export interface CreateAppointmentData {
    business: string;
    service: string;
    startDateTime: string;
    customerNote?: string;
}

export interface AppointmentQuery {
    status?: AppointmentStatus;
    page?: number;
    limit?: number;
}

const getMine = (params: AppointmentQuery = {}) => {
    const abortController = new AbortController();
    const request = apiClient.get<ApiListResponse<Appointment>>("/appointments/mine", {
        params,
        signal: abortController.signal,
    });
    return { request, abort: () => abortController.abort() };
};

const getBusinessAppointments = (businessId: string, params: AppointmentQuery = {}) => {
    const abortController = new AbortController();
    const request = apiClient.get<ApiListResponse<Appointment>>(`/appointments/business/${businessId}`, {
        params,
        signal: abortController.signal,
    });
    return { request, abort: () => abortController.abort() };
};

const create = (data: CreateAppointmentData) =>
    apiClient.post<ApiItemResponse<Appointment>>("/appointments", data);

// "cancelled" is deliberately excluded here - cancellation only ever
// happens through the separate cancel() call below.
const updateStatus = (id: string, status: "confirmed" | "rejected" | "completed") =>
    apiClient.put<ApiItemResponse<Appointment>>(`/appointments/${id}/status`, { status });

const cancel = (id: string, cancellationReason?: string) =>
    apiClient.put<ApiItemResponse<Appointment>>(`/appointments/${id}/cancel`, { cancellationReason });

export default { getMine, getBusinessAppointments, create, updateStatus, cancel };
