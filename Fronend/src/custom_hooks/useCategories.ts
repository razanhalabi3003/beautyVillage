import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../redux/hooks";
import { fetchCategories } from "../redux/categoriesSlice";

const useCategories = () => {
    const dispatch = useAppDispatch();
    const { items, status, error } = useAppSelector((state) => state.categories);

    useEffect(() => {
        // Categories rarely change and are read by many unrelated pages at
        // once - fetch only the first time, not on every consumer's mount.
        if (status === "idle") {
            dispatch(fetchCategories());
        }
    }, [dispatch, status]);

    return { categories: items, isLoading: status === "loading", error };
};

export default useCategories;
