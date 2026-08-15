import { FC, useState } from "react";
import { useAppSelector } from "../../redux/hooks";
import useServices from "../../custom_hooks/useServices";
import serviceService from "../../services/service-service";
import { Service } from "../../types/service";
import { getApiErrorMessage } from "../../utils/apiError";
import LoadingSpinner from "../../Componnents/LoadingSpinner";
import ErrorMessage from "../../Componnents/ErrorMessage";
import EmptyState from "../../Componnents/EmptyState";
import ConfirmDialog from "../../Componnents/ConfirmDialog";
import ServiceModal from "../../Componnents/ServiceModal";

// Business is guaranteed non-null here - DashboardLayout gates rendering of
// this whole route subtree until state.businesses.mine is loaded.
const DashboardServices: FC = () => {
    const business = useAppSelector((state) => state.businesses.mine)!;
    const { services, setServices, isLoading, error } = useServices(business._id);

    const [modalOpen, setModalOpen] = useState(false);
    const [editingService, setEditingService] = useState<Service | undefined>(undefined);

    const [toggleTarget, setToggleTarget] = useState<Service | null>(null);
    const [toggleError, setToggleError] = useState<string | null>(null);
    const [isToggling, setIsToggling] = useState(false);

    const openCreateModal = () => {
        setEditingService(undefined);
        setModalOpen(true);
    };
    const openEditModal = (service: Service) => {
        setEditingService(service);
        setModalOpen(true);
    };
    const handleSaved = (saved: Service) => {
        setServices((prev) => {
            const exists = prev.some((s) => s._id === saved._id);
            return exists ? prev.map((s) => (s._id === saved._id ? saved : s)) : [...prev, saved];
        });
    };

    const handleConfirmToggle = async () => {
        if (!toggleTarget) {
            return;
        }
        setIsToggling(true);
        setToggleError(null);
        try {
            const response = await serviceService.update(toggleTarget._id, { isActive: !toggleTarget.isActive });
            setServices((prev) => prev.map((s) => (s._id === response.data.data._id ? response.data.data : s)));
            setToggleTarget(null);
        } catch (toggleErr) {
            setToggleError(getApiErrorMessage(toggleErr, "אירעה שגיאה בעדכון סטטוס השירות"));
        } finally {
            setIsToggling(false);
        }
    };

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h2 className="h5 mb-0">שירותים</h2>
                <button type="button" className="btn btn-primary btn-sm" onClick={openCreateModal}>
                    הוספת שירות
                </button>
            </div>

            {isLoading && <LoadingSpinner />}
            {!isLoading && error && <ErrorMessage message={error} />}
            {!isLoading && !error && toggleError && (
                <div className="alert alert-danger" role="alert">
                    {toggleError}
                </div>
            )}
            {!isLoading && !error && services.length === 0 && (
                <EmptyState title="עדיין לא נוספו שירותים" description="הוסיפו שירות ראשון כדי שלקוחות יוכלו להזמין תור" />
            )}
            {!isLoading && !error && services.length > 0 && (
                <ul className="list-group">
                    {services.map((service) => (
                        <li key={service._id} className="list-group-item">
                            <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
                                <div>
                                    <div className="d-flex align-items-center gap-2">
                                        <strong>{service.name}</strong>
                                        {!service.isActive && (
                                            <span className="badge bg-secondary">מושבת</span>
                                        )}
                                    </div>
                                    {service.description && (
                                        <p className="text-muted small mb-1">{service.description}</p>
                                    )}
                                    <span className="text-muted small">
                                        {service.price} ₪ · {service.durationMinutes} דקות
                                    </span>
                                </div>
                                <div className="d-flex gap-2">
                                    <button
                                        type="button"
                                        className="btn btn-outline-secondary btn-sm"
                                        onClick={() => openEditModal(service)}
                                    >
                                        עריכה
                                    </button>
                                    <button
                                        type="button"
                                        className={`btn btn-sm ${service.isActive ? "btn-outline-danger" : "btn-outline-success"}`}
                                        onClick={() => setToggleTarget(service)}
                                    >
                                        {service.isActive ? "השבתה" : "הפעלה מחדש"}
                                    </button>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {modalOpen && (
                <ServiceModal
                    businessId={business._id}
                    service={editingService}
                    onClose={() => setModalOpen(false)}
                    onSaved={handleSaved}
                />
            )}

            <ConfirmDialog
                show={!!toggleTarget}
                title={toggleTarget?.isActive ? "השבתת שירות" : "הפעלת שירות מחדש"}
                message={
                    toggleTarget?.isActive
                        ? `להשבית את השירות "${toggleTarget?.name}"? השירות לא יוצג יותר ללקוחות עד להפעלה מחדש.`
                        : `להפעיל מחדש את השירות "${toggleTarget?.name}"? השירות יוצג שוב ללקוחות.`
                }
                confirmLabel={isToggling ? "מעדכן..." : "אישור"}
                onConfirm={handleConfirmToggle}
                onCancel={() => setToggleTarget(null)}
            />
        </div>
    );
};

export default DashboardServices;
