import { FC } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import useAuth from "../custom_hooks/useAuth";
import LoadingSpinner from "./LoadingSpinner";

const ProtectedRoute: FC = () => {
    const { isAuthenticated, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return <LoadingSpinner label="בודק התחברות..." />;
    }
    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }
    return <Outlet />;
};

export default ProtectedRoute;
