import { FC, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAppSelector } from "../../redux/hooks";
import useServices from "../../custom_hooks/useServices";
import useAppointments from "../../custom_hooks/useAppointments";
import StarRating from "../../Componnents/StarRating";
import LoadingSpinner from "../../Componnents/LoadingSpinner";
import ErrorMessage from "../../Componnents/ErrorMessage";
import { AppointmentStatus } from "../../types/appointment";
import { appointmentStatusLabels } from "../../utils/appointmentStatus";

const NAV_CARDS = [
    { to: "/dashboard/business", label: "פרטי העסק" },
    { to: "/dashboard/services", label: "שירותים" },
    { to: "/dashboard/portfolio", label: "תיק עבודות" },
    { to: "/dashboard/appointments", label: "ניהול תורים" },
];

// Appointment counts are derived from the same GET /appointments/business/:id
// data already fetched for the dashboard - no separate statistics endpoint.
const DashboardOverview: FC = () => {
    const business = useAppSelector((state) => state.businesses.mine);
    const { services, isLoading: servicesLoading, error: servicesError } = useServices(business?._id ?? "");
    const {
        appointments,
        isLoading: appointmentsLoading,
        error: appointmentsError,
    } = useAppointments({ businessId: business?._id ?? "" });

    const statusCounts = useMemo(() => {
        const counts: Record<AppointmentStatus, number> = {
            pending: 0,
            confirmed: 0,
            completed: 0,
            cancelled: 0,
            rejected: 0,
        };
        for (const appointment of appointments) {
            counts[appointment.status] += 1;
        }
        return counts;
    }, [appointments]);

    if (!business) {
        return null;
    }
    if (servicesLoading || appointmentsLoading) {
        return <LoadingSpinner />;
    }
    if (servicesError || appointmentsError) {
        return <ErrorMessage message={servicesError ?? appointmentsError ?? "שגיאה בטעינת נתוני הסקירה"} />;
    }

    return (
        <div>
            <h2 className="h5 mb-3">סקירה כללית</h2>
            <div className="row g-3 mb-4">
                <div className="col-6 col-md-3">
                    <div className="card p-3 text-center h-100">
                        <StarRating rating={business.averageRating} />
                        <span className="text-muted small mt-1">{business.reviewCount} ביקורות</span>
                    </div>
                </div>
                <div className="col-6 col-md-3">
                    <div className="card p-3 text-center h-100">
                        <span className="h4 mb-0">{services.length}</span>
                        <span className="text-muted small">שירותים</span>
                    </div>
                </div>
                {(Object.keys(statusCounts) as AppointmentStatus[]).map((status) => (
                    <div className="col-6 col-md-3" key={status}>
                        <div className="card p-3 text-center h-100">
                            <span className="h4 mb-0">{statusCounts[status]}</span>
                            <span className="text-muted small">{appointmentStatusLabels[status]}</span>
                        </div>
                    </div>
                ))}
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

export default DashboardOverview;
