export interface Service {
    _id: string;
    business: string;
    name: string;
    description?: string;
    price: number;
    durationMinutes: number;
    isActive: boolean;
}
