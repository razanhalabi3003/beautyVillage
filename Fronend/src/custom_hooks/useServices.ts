import { useEffect, useState } from "react";
import serviceService from "../services/service-service";
import { CanceledError } from "../services/api-client";
import { Service } from "../types/service";

// Local state, not Redux - unlike businesses/categories/appointments/reviews,
// a business's service list is only ever read in one place at a time
// (BusinessDetail's read-only view, or the owner's dashboard editor), so
// there is no cross-page cache worth centralizing.
const useServices = (businessId: string | undefined) => {
    const [services, setServices] = useState<Service[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    useEffect(() => {
        if (!businessId) {
            return;
        }
        setIsLoading(true);
        const { request, abort } = serviceService.list(businessId);
        request
            .then((response) => {
                setServices(response.data.data);
                setIsLoading(false);
            })
            .catch((err) => {
                if (!(err instanceof CanceledError)) {
                    setError(err.message);
                    setIsLoading(false);
                }
            });
        return abort;
    }, [businessId]);

    return { services, setServices, error, setError, isLoading, setIsLoading };
};

export default useServices;
