import { FC, useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../redux/hooks";
import { fetchAdminReviews, updateReviewVisibility } from "../../redux/reviewsSlice";
import { Review } from "../../types/review";
import { formatDate } from "../../utils/formatDate";
import StarRating from "../../Componnents/StarRating";
import LoadingSpinner from "../../Componnents/LoadingSpinner";
import ErrorMessage from "../../Componnents/ErrorMessage";
import EmptyState from "../../Componnents/EmptyState";
import ConfirmDialog from "../../Componnents/ConfirmDialog";

type Tab = "all" | "visible" | "hidden";

const TABS: { value: Tab; label: string }[] = [
    { value: "all", label: "הכל" },
    { value: "visible", label: "מוצגות" },
    { value: "hidden", label: "מוסתרות" },
];

const AdminReviews: FC = () => {
    const dispatch = useAppDispatch();
    const { adminList, status, error } = useAppSelector((state) => state.reviews);
    const [activeTab, setActiveTab] = useState<Tab>("all");
    const [actionError, setActionError] = useState<string | null>(null);
    const [visibilityTarget, setVisibilityTarget] = useState<Review | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        const isVisible = activeTab === "all" ? undefined : activeTab === "visible";
        dispatch(fetchAdminReviews({ isVisible, limit: 50 }));
    }, [dispatch, activeTab]);

    const handleConfirmToggle = async () => {
        if (!visibilityTarget) {
            return;
        }
        setIsProcessing(true);
        setActionError(null);
        try {
            await dispatch(
                updateReviewVisibility({ id: visibilityTarget._id, isVisible: !visibilityTarget.isVisible })
            ).unwrap();
            setVisibilityTarget(null);
        } catch {
            setActionError("אירעה שגיאה בעדכון הביקורת");
        } finally {
            setIsProcessing(false);
        }
    };

    // customer/business can populate to null when the referenced document no
    // longer exists (an orphaned reference), not just a plain id or the
    // expected populated object - same defensive handling as AdminBusinesses.
    const customerName = (review: Review) =>
        review.customer && typeof review.customer !== "string" ? review.customer.name : "—";
    const businessName = (review: Review) =>
        review.business && typeof review.business !== "string" ? review.business.name : "—";

    return (
        <div>
            <h2 className="h5 mb-3">ביקורות</h2>

            <ul className="nav nav-tabs mb-3">
                {TABS.map((tab) => (
                    <li className="nav-item" key={tab.value}>
                        <button
                            type="button"
                            className={`nav-link${activeTab === tab.value ? " active" : ""}`}
                            onClick={() => setActiveTab(tab.value)}
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
            {status !== "loading" && !error && adminList.length === 0 && <EmptyState title="אין ביקורות להצגה" />}
            {status !== "loading" &&
                !error &&
                adminList.map((review) => (
                    <div key={review._id} className="card p-3 mb-3">
                        <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
                            <div>
                                <h3 className="h6 mb-1">{businessName(review)}</h3>
                                <p className="mb-1 small text-muted">{customerName(review)}</p>
                                <StarRating rating={review.rating} />
                                {review.comment && <p className="mb-1 mt-1 small">{review.comment}</p>}
                                <p className="mb-0 small text-muted">{formatDate(review.createdAt)}</p>
                            </div>
                            <span
                                className="badge rounded-pill"
                                style={{
                                    backgroundColor: "var(--bv-bg-alt)",
                                    color: review.isVisible ? "var(--bv-success)" : "var(--bv-danger)",
                                }}
                            >
                                {review.isVisible ? "מוצגת" : "מוסתרת"}
                            </span>
                        </div>
                        <div className="mt-2">
                            <button
                                type="button"
                                className={`btn btn-sm ${review.isVisible ? "btn-outline-danger" : "btn-outline-success"}`}
                                onClick={() => setVisibilityTarget(review)}
                            >
                                {review.isVisible ? "הסתרה" : "שחזור"}
                            </button>
                        </div>
                    </div>
                ))}

            <ConfirmDialog
                show={!!visibilityTarget}
                title={visibilityTarget?.isVisible ? "הסתרת ביקורת" : "שחזור ביקורת"}
                message={
                    visibilityTarget?.isVisible
                        ? "להסתיר את הביקורת? היא לא תוצג יותר ללקוחות עד לשחזור."
                        : "לשחזר את הביקורת? היא תוצג שוב ללקוחות."
                }
                confirmLabel={isProcessing ? "מעדכן..." : "אישור"}
                onConfirm={handleConfirmToggle}
                onCancel={() => setVisibilityTarget(null)}
            />
        </div>
    );
};

export default AdminReviews;
