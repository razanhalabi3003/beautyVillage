export type MediaType = "logo" | "cover" | "portfolio";

// Metadata only - the raw bytes are never held in frontend state, they are
// always fetched by the browser directly from GET /media/:id as an <img src>.
export interface MediaMeta {
    _id: string;
    business: string;
    type: MediaType;
    contentType: string;
    size: number;
    createdAt: string;
}
