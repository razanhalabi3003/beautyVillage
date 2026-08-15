import apiClient from "./api-client";
import { AdminStats } from "../types/adminStats";
import { ApiItemResponse } from "../types/api";

const getStats = () => apiClient.get<ApiItemResponse<AdminStats>>("/admin/stats");

export default { getStats };
