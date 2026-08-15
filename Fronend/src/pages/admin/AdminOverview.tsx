import { FC, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import adminService from "../../services/admin-service";
import { AdminStats } from "../../types/adminStats";
import { CanceledError } from "../../services/api-client";
import LoadingSpinner from "../../Componnents/LoadingSpinner";
import ErrorMessage from "../../Componnents/ErrorMessage";

const NAV_CARDS = [
    { to: "/admin/businesses", label: "עסקים" },
    { to: "/admin/users", label: "משתמשים" },
    { to: "/admin/reviews", label: "ביקורות" },
    { to: "/admin/categories", label: "קטגוריות" },
];

const StatCard: FC<{ value: number; label: string }> = ({ value, label }) => (
    <div className="col-6 col-md-3 col-lg-2">
        <div className="card p-3 text-center h-100">
            <span className="h4 mb-0">{value}</span>
            <span className="text-muted small">{label}</span>
        </div>
    </div>
);

// A one-shot fetch for a single page - no cross-page sharing need, so this
// is local state rather than a Redux slice (same reasoning as AdminUsers).
const AdminOverview: FC = () => {
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        setIsLoading(true);
        adminService
            .getStats()
            .then((response) => {
                if (!cancelled) {
                    setStats(response.data.data);
                    setIsLoading(false);
                }
            })
            .catch((err) => {
                if (!cancelled && !(err instanceof CanceledError)) {
                    setError("שגיאה בטעינת נתוני הסקירה");
                    setIsLoading(false);
                }
            });
        return () => {
            cancelled = true;
        };
    }, []);

    if (isLoading) {
        return <LoadingSpinner />;
    }
    if (error || !stats) {
        return <ErrorMessage message={error ?? "שגיאה בטעינת נתוני הסקירה"} />;
    }

    return (
        <div>
            <h2 className="h5 mb-3">סקירה כללית</h2>

            <h3 className="h6 text-muted mb-2">משתמשים</h3>
            <div className="row g-3 mb-4">
                <StatCard value={stats.users.total} label="סה״כ" />
                <StatCard value={stats.users.active} label="פעילים" />
                <StatCard value={stats.users.inactive} label="מושהים" />
            </div>

            <h3 className="h6 text-muted mb-2">עסקים</h3>
            <div className="row g-3 mb-4">
                <StatCard value={stats.businesses.pending} label="ממתינים לאישור" />
                <StatCard value={stats.businesses.approved} label="מאושרים" />
                <StatCard value={stats.businesses.rejected} label="נדחו" />
                <StatCard value={stats.businesses.suspended} label="מושהים" />
                <StatCard value={stats.businesses.total} label="סה״כ" />
            </div>

            <h3 className="h6 text-muted mb-2">תורים</h3>
            <div className="row g-3 mb-4">
                <StatCard value={stats.appointments.pending} label="ממתינים לאישור" />
                <StatCard value={stats.appointments.confirmed} label="מאושרים" />
                <StatCard value={stats.appointments.completed} label="הושלמו" />
                <StatCard value={stats.appointments.cancelled} label="בוטלו" />
                <StatCard value={stats.appointments.rejected} label="נדחו" />
                <StatCard value={stats.appointments.total} label="סה״כ" />
            </div>

            <h3 className="h6 text-muted mb-2">ביקורות</h3>
            <div className="row g-3 mb-4">
                <StatCard value={stats.reviews.total} label="סה״כ" />
                <StatCard value={stats.reviews.visible} label="מוצגות" />
                <StatCard value={stats.reviews.hidden} label="מוסתרות" />
            </div>

            <div className="row g-3">
                {NAV_CARDS.map((card) => (
                    <div className="col-6 col-md-3" key={card.to}>
                        <Link
                            to={card.to}
                            className="card p-3 text-center h-100 text-decoration-none text-reset d-flex align-items-center justify-content-center"
                            style={{ minHeight: "90px" }}
                        >
                            {card.label}
                        </Link>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AdminOverview;
