export interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

// Stage 5+ endpoints (categories, businesses, services, appointments,
// reviews, media). Stage 3/4 endpoints (auth, posts, comments) return raw
// bodies instead and are typed separately where used.
export interface ApiListResponse<T> {
    success: true;
    data: T[];
    pagination: Pagination;
}

export interface ApiItemResponse<T> {
    success: true;
    data: T;
}

export interface ApiErrorResponse {
    success: false;
    message: string;
    errors: string[];
}
