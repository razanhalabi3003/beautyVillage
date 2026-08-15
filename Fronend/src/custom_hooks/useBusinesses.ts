import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../redux/hooks";
import { fetchBusinesses } from "../redux/businessesSlice";
import { BusinessListParams } from "../services/business-service";

const useBusinesses = (params: BusinessListParams = {}) => {
    const dispatch = useAppDispatch();
    const { items, pagination, status, error } = useAppSelector((state) => state.businesses);

    useEffect(() => {
        dispatch(fetchBusinesses(params));
        // params is re-created on every render by most callers - comparing
        // its serialized form avoids an infinite fetch loop.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dispatch, JSON.stringify(params)]);

    return { businesses: items, pagination, isLoading: status === "loading", error };
};

export default useBusinesses;
