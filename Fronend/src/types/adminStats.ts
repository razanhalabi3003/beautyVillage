export interface AdminStats {
    users: {
        total: number;
        active: number;
        inactive: number;
    };
    businesses: {
        total: number;
        pending: number;
        approved: number;
        rejected: number;
        suspended: number;
    };
    appointments: {
        total: number;
        pending: number;
        confirmed: number;
        completed: number;
        cancelled: number;
        rejected: number;
    };
    reviews: {
        total: number;
        visible: number;
        hidden: number;
    };
}
