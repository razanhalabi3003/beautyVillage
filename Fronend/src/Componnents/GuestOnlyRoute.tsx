import { FC } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import type { Location } from "react-router-dom";
import useAuth from "../custom_hooks/useAuth";
import LoadingSpinner from "./LoadingSpinner";

const GuestOnlyRoute: FC = () => {
    const { isAuthenticated, isLoading } = useAuth();
    const location = useLocation();
    const from = (location.state as { from?: Location } | null)?.from;

    if (isLoading) {
        return <LoadingSpinner />;
    }
    if (isAuthenticated) {
        return <Navigate to={from?.pathname ?? "/"} replace />;
    }
    return <Outlet />;
};

export default GuestOnlyRoute;
