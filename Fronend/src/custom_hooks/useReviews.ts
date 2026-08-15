import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../redux/hooks";
import { fetchReviewsByBusiness } from "../redux/reviewsSlice";

const useReviews = (businessId: string | undefined) => {
    const dispatch = useAppDispatch();
    const { byBusiness, status, error } = useAppSelector((state) => state.reviews);

    useEffect(() => {
        if (!businessId) {
            return;
        }
        dispatch(fetchReviewsByBusiness(businessId));
    }, [dispatch, businessId]);

    return {
        reviews: businessId ? (byBusiness[businessId] ?? []) : [],
        isLoading: status === "loading",
        error,
    };
};

export default useReviews;
