import apiClient, { API_BASE_URL } from "./api-client";
import { MediaMeta } from "../types/media";
import { ApiListResponse } from "../types/api";

const getBusinessMedia = (businessId: string) => {
    const abortController = new AbortController();
    const request = apiClient.get<ApiListResponse<MediaMeta>>(`/media/business/${businessId}`, {
        signal: abortController.signal,
    });
    return { request, abort: () => abortController.abort() };
};

// Builds a plain URL for <img src> - GET /media/:id returns raw image bytes,
// the browser fetches it directly. Never converted to base64 or stored in
// Redux/component state.
const getMediaUrl = (mediaId: string) => `${API_BASE_URL}/media/${mediaId}`;

export default { getBusinessMedia, getMediaUrl };
