import { FC, useEffect, useState } from "react";
import userService from "../../services/user-service";
import { User } from "../../types/user";
import { Pagination as PaginationType } from "../../types/api";
import { CanceledError } from "../../services/api-client";
import { getApiErrorMessage } from "../../utils/apiError";
import { formatDate } from "../../utils/formatDate";
import { userRoleLabels } from "../../utils/userRole";
import LoadingSpinner from "../../Componnents/LoadingSpinner";
import ErrorMessage from "../../Componnents/ErrorMessage";
import EmptyState from "../../Componnents/EmptyState";
import ConfirmDialog from "../../Componnents/ConfirmDialog";
import Pagination from "../../Componnents/Pagination";

// Local state, not Redux - single consumer, no other page needs the user
// list, matching the DashboardServices/AdminOverview precedent.
const AdminUsers: FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [pagination, setPagination] = useState<PaginationType | null>(null);
    const [page, setPage] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [statusTarget, setStatusTarget] = useState<User | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        setIsLoading(true);
        const { request, abort } = userService.list(page);
        request
            .then((response) => {
                setUsers(response.data.data);
                setPagination(response.data.pagination);
                setIsLoading(false);
            })
            .catch((err) => {
                if (!(err instanceof CanceledError)) {
                    setError("שגיאה בטעינת משתמשים");
                    setIsLoading(false);
                }
            });
        return abort;
    }, [page]);

    const handleConfirmToggle = async () => {
        if (!statusTarget) {
            return;
        }
        setIsProcessing(true);
        setActionError(null);
        try {
            const response = await userService.updateStatus(statusTarget._id, !statusTarget.isActive);
            setUsers((prev) => prev.map((u) => (u._id === response.data.data._id ? response.data.data : u)));
            setStatusTarget(null);
        } catch (err) {
            setActionError(getApiErrorMessage(err, "אירעה שגיאה בעדכון סטטוס המשתמש"));
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div>
            <h2 className="h5 mb-3">משתמשים</h2>

            {actionError && (
                <div className="alert alert-danger" role="alert">
                    {actionError}
                </div>
            )}

            {isLoading && <LoadingSpinner />}
            {!isLoading && error && <ErrorMessage message={error} />}
            {!isLoading && !error && users.length === 0 && <EmptyState title="אין משתמשים להצגה" />}
            {!isLoading &&
                !error &&
                users.map((user) => (
                    <div key={user._id} className="card p-3 mb-3">
                        <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
                            <div>
                                <h3 className="h6 mb-1">{user.name}</h3>
                                <p className="mb-1 small text-muted">{user.email}</p>
                                {user.phone && <p className="mb-1 small text-muted">{user.phone}</p>}
                                <p className="mb-1 small text-muted">נרשם: {formatDate(user.createdAt)}</p>
                            </div>
                            <div className="d-flex flex-column align-items-end gap-1">
                                <span
                                    className="badge rounded-pill"
                                    style={{ backgroundColor: "var(--bv-bg-alt)", color: "var(--bv-primary)" }}
                                >
                                    {userRoleLabels[user.role]}
                                </span>
                                <span
                                    className="badge rounded-pill"
                                    style={{
                                        backgroundColor: "var(--bv-bg-alt)",
                                        color: user.isActive ? "var(--bv-success)" : "var(--bv-danger)",
                                    }}
                                >
                                    {user.isActive ? "פעיל" : "מושהה"}
                                </span>
                            </div>
                        </div>
                        <div className="mt-2">
                            <button
                                type="button"
                                className={`btn btn-sm ${user.isActive ? "btn-outline-danger" : "btn-outline-success"}`}
                                onClick={() => setStatusTarget(user)}
                            >
                                {user.isActive ? "השעיה" : "הפעלת חשבון"}
                            </button>
                        </div>
                    </div>
                ))}

            {pagination && (
                <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={setPage} />
            )}

            <ConfirmDialog
                show={!!statusTarget}
                title={statusTarget?.isActive ? "השעיית משתמש" : "הפעלת משתמש מחדש"}
                message={
                    statusTarget?.isActive
                        ? `להשעות את המשתמש "${statusTarget?.name}"? המשתמש לא יוכל להתחבר עד להפעלה מחדש.`
                        : `להפעיל מחדש את המשתמש "${statusTarget?.name}"?`
                }
                confirmLabel={isProcessing ? "מעדכן..." : "אישור"}
                onConfirm={handleConfirmToggle}
                onCancel={() => setStatusTarget(null)}
            />
        </div>
    );
};

export default AdminUsers;
