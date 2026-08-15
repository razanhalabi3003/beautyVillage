import { FC, useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../redux/hooks";
import { fetchAdminBusinesses, approveBusiness, suspendBusiness } from "../../redux/businessesSlice";
import { Business, ApprovalStatus } from "../../types/business";
import { approvalStatusLabels, approvalStatusColors, isSuspended } from "../../utils/businessStatus";
import { formatDate } from "../../utils/formatDate";
import LoadingSpinner from "../../Componnents/LoadingSpinner";
import ErrorMessage from "../../Componnents/ErrorMessage";
import EmptyState from "../../Componnents/EmptyState";
import ConfirmDialog from "../../Componnents/ConfirmDialog";
import Pagination from "../../Componnents/Pagination";
import RejectBusinessModal from "../../Componnents/RejectBusinessModal";

const TABS: { value: ApprovalStatus; label: string }[] = [
    { value: "pending", label: "ממתינים" },
    { value: "approved", label: "מאושרים" },
    { value: "rejected", label: "נדחו" },
];

type PendingConfirm = { type: "approve" | "suspend" | "reactivate"; business: Business } | null;

const AdminBusinesses: FC = () => {
    const dispatch = useAppDispatch();
    const { adminList, adminPagination, status, error } = useAppSelector((state) => state.businesses);
    const [activeTab, setActiveTab] = useState<ApprovalStatus>("pending");
    const [page, setPage] = useState(1);

    const [approvingId, setApprovingId] = useState<string | null>(null);
    const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm>(null);
    const [isProcessingConfirm, setIsProcessingConfirm] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);
    const [rejectTarget, setRejectTarget] = useState<Business | null>(null);

    useEffect(() => {
        dispatch(fetchAdminBusinesses({ status: activeTab, page }));
    }, [dispatch, activeTab, page]);

    const changeTab = (tab: ApprovalStatus) => {
        setActiveTab(tab);
        setPage(1);
    };

    const handleApprove = async (id: string) => {
        setApprovingId(id);
        setActionError(null);
        try {
            await dispatch(approveBusiness(id)).unwrap();
        } catch (submitError) {
            setActionError(typeof submitError === "string" ? submitError : "אירעה שגיאה באישור העסק");
        } finally {
            setApprovingId(null);
        }
    };

    const handleConfirmPendingAction = async () => {
        if (!pendingConfirm) {
            return;
        }
        setIsProcessingConfirm(true);
        setActionError(null);
        try {
            if (pendingConfirm.type === "approve") {
                await dispatch(approveBusiness(pendingConfirm.business._id)).unwrap();
            } else {
                await dispatch(
                    suspendBusiness({ id: pendingConfirm.business._id, isActive: pendingConfirm.type === "reactivate" })
                ).unwrap();
            }
            setPendingConfirm(null);
        } catch (submitError) {
            setActionError(typeof submitError === "string" ? submitError : "אירעה שגיאה בעדכון העסק");
        } finally {
            setIsProcessingConfirm(false);
        }
    };

    // owner/category can populate to null when the referenced document no
    // longer exists (an orphaned reference) - not just a plain id or the
    // expected populated object, so both must be guarded, not just typeof.
    const ownerName = (business: Business) =>
        business.owner && typeof business.owner !== "string" ? business.owner.name : "—";
    const ownerEmail = (business: Business) =>
        business.owner && typeof business.owner !== "string" ? business.owner.email : "";
    const categoryName = (business: Business) =>
        business.category && typeof business.category !== "string" ? business.category.name : "—";

    const renderCard = (business: Business) => {
        const suspended = isSuspended(business);
        return (
            <div key={business._id} className="card p-3 mb-3">
                <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
                    <div>
                        <h3 className="h6 mb-1">{business.name}</h3>
                        <p className="mb-1 small text-muted">
                            {ownerName(business)} · {ownerEmail(business)}
                        </p>
                        <p className="mb-1 small text-muted">{categoryName(business)}</p>
                        <p className="mb-1 small text-muted">
                            {business.address} · {business.phone}
                        </p>
                        <p className="mb-1 small text-muted">נוצר: {formatDate(business.createdAt)}</p>
                        {business.rejectionReason && (
                            <p className="mb-1 small text-danger">סיבת דחייה: {business.rejectionReason}</p>
                        )}
                    </div>
                    <div className="d-flex flex-column align-items-end gap-1">
                        <span
                            className="badge rounded-pill"
                            style={{
                                backgroundColor: "var(--bv-bg-alt)",
                                color: approvalStatusColors[business.approvalStatus],
                            }}
                        >
                            {approvalStatusLabels[business.approvalStatus]}
                        </span>
                        {suspended && (
                            <span
                                className="badge rounded-pill"
                                style={{ backgroundColor: "var(--bv-bg-alt)", color: "var(--bv-danger)" }}
                            >
                                מושהה
                            </span>
                        )}
                    </div>
                </div>

                <div className="d-flex gap-2 mt-2 flex-wrap">
                    {business.approvalStatus === "pending" && (
                        <>
                            <button
                                type="button"
                                className="btn btn-sm btn-primary"
                                disabled={approvingId === business._id}
                                onClick={() => handleApprove(business._id)}
                            >
                                {approvingId === business._id ? "מאשר..." : "אישור"}
                            </button>
                            <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => setRejectTarget(business)}
                            >
                                דחייה
                            </button>
                        </>
                    )}
                    {business.approvalStatus === "approved" && !suspended && (
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => setPendingConfirm({ type: "suspend", business })}
                        >
                            השעיה
                        </button>
                    )}
                    {business.approvalStatus === "approved" && suspended && (
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-success"
                            onClick={() => setPendingConfirm({ type: "reactivate", business })}
                        >
                            הפעלה מחדש
                        </button>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div>
            <h2 className="h5 mb-3">עסקים</h2>

            <ul className="nav nav-tabs mb-3">
                {TABS.map((tab) => (
                    <li className="nav-item" key={tab.value}>
                        <button
                            type="button"
                            className={`nav-link${activeTab === tab.value ? " active" : ""}`}
                            onClick={() => changeTab(tab.value)}
                        >
                            {tab.label}
                        </button>
                    </li>
                ))}
            </ul>

            {actionError && (
                <div className="alert alert-danger" role="alert">
                    {actionError}
                </div>
            )}

            {status === "loading" && <LoadingSpinner />}
            {status !== "loading" && error && <ErrorMessage message={error} />}
            {status !== "loading" && !error && adminList.length === 0 && <EmptyState title="אין עסקים להצגה" />}
            {status !== "loading" && !error && adminList.length > 0 && adminList.map(renderCard)}

            {adminPagination && (
                <Pagination page={adminPagination.page} totalPages={adminPagination.totalPages} onPageChange={setPage} />
            )}

            <ConfirmDialog
                show={!!pendingConfirm}
                title={pendingConfirm?.type === "suspend" ? "השעיית עסק" : "הפעלת עסק מחדש"}
                message={
                    pendingConfirm?.type === "suspend"
                        ? `להשעות את "${pendingConfirm?.business.name}"? העסק לא יוצג יותר ללקוחות.`
                        : pendingConfirm?.type === "reactivate"
                          ? `להפעיל מחדש את "${pendingConfirm?.business.name}"? העסק יוצג שוב ללקוחות.`
                          : `לאשר את "${pendingConfirm?.business.name}"?`
                }
                confirmLabel={isProcessingConfirm ? "מעדכן..." : "אישור"}
                onConfirm={handleConfirmPendingAction}
                onCancel={() => setPendingConfirm(null)}
            />

            {rejectTarget && (
                <RejectBusinessModal
                    businessId={rejectTarget._id}
                    businessName={rejectTarget.name}
                    onClose={() => setRejectTarget(null)}
                />
            )}
        </div>
    );
};

export default AdminBusinesses;
