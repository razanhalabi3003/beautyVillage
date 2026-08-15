import { FC, useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../redux/hooks";
import { fetchMyBusiness } from "../../redux/businessesSlice";
import LoadingSpinner from "../../Componnents/LoadingSpinner";
import ErrorMessage from "../../Componnents/ErrorMessage";
import { approvalStatusLabels, approvalStatusColors, isSuspended } from "../../utils/businessStatus";

// Business now lives in Redux (businessesSlice.mine) rather than local state,
// so an edit made on /dashboard/business (or any other dashboard page) is
// reflected immediately everywhere else in the dashboard - this header
// badge included - without prop-drilling through an Outlet context.
const DashboardLayout: FC = () => {
    const dispatch = useAppDispatch();
    const business = useAppSelector((state) => state.businesses.mine);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setIsLoading(true);
        dispatch(fetchMyBusiness())
            .unwrap()
            .catch(() => setError("שגיאה בטעינת נתוני העסק"))
            .finally(() => setIsLoading(false));
    }, [dispatch]);

    if (isLoading) {
        return <LoadingSpinner />;
    }
    if (error) {
        return <ErrorMessage message={error} />;
    }
    if (!business) {
        // Shouldn't happen behind RoleProtectedRoute(businessOwner) - an
        // approved owner always has a business - but fail visibly rather
        // than silently rendering broken nested pages if it ever does.
        return <ErrorMessage message="לא נמצא עסק המשויך לחשבון זה" />;
    }

    return (
        <div className="container">
            <div className="d-flex align-items-center gap-2 mb-4 flex-wrap">
                <h1 className="h4 mb-0">{business.name}</h1>
                <span
                    className="badge rounded-pill"
                    style={{ backgroundColor: "var(--bv-bg-alt)", color: approvalStatusColors[business.approvalStatus] }}
                >
                    {approvalStatusLabels[business.approvalStatus]}
                </span>
                {isSuspended(business) && (
                    <span
                        className="badge rounded-pill"
                        style={{ backgroundColor: "var(--bv-bg-alt)", color: "var(--bv-danger)" }}
                    >
                        מושהה
                    </span>
                )}
            </div>
            <div className="row">
                <div className="col-12 col-md-3 mb-4">
                    <div className="list-group">
                        <NavLink to="/dashboard" end className="list-group-item list-group-item-action">
                            סקירה כללית
                        </NavLink>
                        <NavLink to="/dashboard/business" className="list-group-item list-group-item-action">
                            פרטי העסק
                        </NavLink>
                        <NavLink to="/dashboard/services" className="list-group-item list-group-item-action">
                            שירותים
                        </NavLink>
                        <NavLink to="/dashboard/portfolio" className="list-group-item list-group-item-action">
                            תיק עבודות
                        </NavLink>
                        <NavLink to="/dashboard/appointments" className="list-group-item list-group-item-action">
                            ניהול תורים
                        </NavLink>
                    </div>
                </div>
                <div className="col-12 col-md-9">
                    <Outlet />
                </div>
            </div>
        </div>
    );
};

export default DashboardLayout;
