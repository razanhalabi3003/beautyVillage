import { lazy, Suspense, ReactElement } from "react";
import { createBrowserRouter } from "react-router-dom";
import Layout from "./Componnents/Layout";
import ProtectedRoute from "./Componnents/ProtectedRoute";
import RoleProtectedRoute from "./Componnents/RoleProtectedRoute";
import GuestOnlyRoute from "./Componnents/GuestOnlyRoute";
import LoadingSpinner from "./Componnents/LoadingSpinner";

// Core, high-frequency public/account pages are statically imported for
// stable navigation - this project's folder lives under OneDrive sync,
// where an on-demand dynamic import() can transiently fail mid-sync
// ("Failed to fetch dynamically imported module"). A statically imported
// page has no later on-demand fetch left to fail.
import Home from "./pages/public/Home";
import BusinessList from "./pages/public/BusinessList";
import BusinessDetail from "./pages/public/BusinessDetail";
import Login from "./pages/public/Login";
import Register from "./pages/public/Register";
import NotFound from "./pages/public/NotFound";
import Profile from "./pages/account/Profile";
import SubmitBusiness from "./pages/account/SubmitBusiness";
import MyAppointments from "./pages/account/MyAppointments";

// Dashboard/admin pages are genuinely React.lazy + Suspense code-split -
// they sit behind RoleProtectedRoute, are reached far less often than the
// public browsing/auth flow, and are a real, natural code-split boundary
// (course requirement: React.lazy).
const DashboardLayout = lazy(() => import("./pages/dashboard/DashboardLayout"));
const DashboardOverview = lazy(() => import("./pages/dashboard/DashboardOverview"));
const DashboardBusiness = lazy(() => import("./pages/dashboard/DashboardBusiness"));
const DashboardServices = lazy(() => import("./pages/dashboard/DashboardServices"));
const DashboardPortfolio = lazy(() => import("./pages/dashboard/DashboardPortfolio"));
const DashboardAppointments = lazy(() => import("./pages/dashboard/DashboardAppointments"));

const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminOverview = lazy(() => import("./pages/admin/AdminOverview"));
const AdminBusinesses = lazy(() => import("./pages/admin/AdminBusinesses"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminReviews = lazy(() => import("./pages/admin/AdminReviews"));
const AdminCategories = lazy(() => import("./pages/admin/AdminCategories"));

const withSuspense = (element: ReactElement): ReactElement => (
    <Suspense fallback={<LoadingSpinner />}>{element}</Suspense>
);

const router = createBrowserRouter([
    {
        element: <Layout />,
        children: [
            { path: "/", element: <Home /> },
            { path: "/businesses", element: <BusinessList /> },
            { path: "/businesses/:id", element: <BusinessDetail /> },
            {
                element: <GuestOnlyRoute />,
                children: [
                    { path: "/login", element: <Login /> },
                    { path: "/register", element: <Register /> },
                ],
            },
            {
                element: <ProtectedRoute />,
                children: [{ path: "/profile", element: <Profile /> }],
            },
            {
                element: <RoleProtectedRoute roles={["customer", "businessOwner"]} />,
                children: [
                    { path: "/submit-business", element: <SubmitBusiness /> },
                    { path: "/my-appointments", element: <MyAppointments /> },
                ],
            },
            {
                path: "/dashboard",
                element: <RoleProtectedRoute roles={["businessOwner"]} />,
                children: [
                    {
                        element: withSuspense(<DashboardLayout />),
                        children: [
                            { index: true, element: withSuspense(<DashboardOverview />) },
                            { path: "business", element: withSuspense(<DashboardBusiness />) },
                            { path: "services", element: withSuspense(<DashboardServices />) },
                            { path: "portfolio", element: withSuspense(<DashboardPortfolio />) },
                            { path: "appointments", element: withSuspense(<DashboardAppointments />) },
                        ],
                    },
                ],
            },
            {
                path: "/admin",
                element: <RoleProtectedRoute roles={["admin"]} />,
                children: [
                    {
                        element: withSuspense(<AdminLayout />),
                        children: [
                            { index: true, element: withSuspense(<AdminOverview />) },
                            { path: "businesses", element: withSuspense(<AdminBusinesses />) },
                            { path: "users", element: withSuspense(<AdminUsers />) },
                            { path: "reviews", element: withSuspense(<AdminReviews />) },
                            { path: "categories", element: withSuspense(<AdminCategories />) },
                        ],
                    },
                ],
            },
            { path: "*", element: <NotFound /> },
        ],
    },
]);

export default router;
