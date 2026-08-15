import { FC } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import useAuth from "../custom_hooks/useAuth";
import { UserRole } from "../types/user";
import LoadingSpinner from "./LoadingSpinner";

interface RoleProtectedRouteProps {
    roles: UserRole[];
}

const RoleProtectedRoute: FC<RoleProtectedRouteProps> = ({ roles }) => {
    const { isAuthenticated, isLoading, user } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return <LoadingSpinner label="בודק הרשאות..." />;
    }
    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }
    if (!user || !roles.includes(user.role)) {
        return <Navigate to="/" replace />;
    }
    return <Outlet />;
};

export default RoleProtectedRoute;
