import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../redux/hooks";
import { fetchBusinessById, clearCurrentBusiness } from "../redux/businessesSlice";

const useBusiness = (id: string | undefined) => {
    const dispatch = useAppDispatch();
    const { currentBusiness, status, error } = useAppSelector((state) => state.businesses);

    useEffect(() => {
        if (!id) {
            return;
        }
        dispatch(fetchBusinessById(id));
        return () => {
            dispatch(clearCurrentBusiness());
        };
    }, [dispatch, id]);

    return { business: currentBusiness, isLoading: status === "loading", error };
};

export default useBusiness;
