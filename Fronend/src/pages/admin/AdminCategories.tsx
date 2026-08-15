import { FC, useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../redux/hooks";
import { fetchAdminCategories, updateCategory, deactivateCategory } from "../../redux/categoriesSlice";
import { Category } from "../../types/category";
import LoadingSpinner from "../../Componnents/LoadingSpinner";
import ErrorMessage from "../../Componnents/ErrorMessage";
import EmptyState from "../../Componnents/EmptyState";
import ConfirmDialog from "../../Componnents/ConfirmDialog";
import CategoryModal from "../../Componnents/CategoryModal";

const AdminCategories: FC = () => {
    const dispatch = useAppDispatch();
    const { adminList, status, error } = useAppSelector((state) => state.categories);

    const [modalOpen, setModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | undefined>(undefined);

    const [toggleTarget, setToggleTarget] = useState<Category | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        dispatch(fetchAdminCategories());
    }, [dispatch]);

    const openCreateModal = () => {
        setEditingCategory(undefined);
        setModalOpen(true);
    };
    const openEditModal = (category: Category) => {
        setEditingCategory(category);
        setModalOpen(true);
    };

    const handleConfirmToggle = async () => {
        if (!toggleTarget) {
            return;
        }
        setIsProcessing(true);
        setActionError(null);
        try {
            if (toggleTarget.isActive) {
                await dispatch(deactivateCategory(toggleTarget._id)).unwrap();
            } else {
                await dispatch(updateCategory({ id: toggleTarget._id, data: { isActive: true } })).unwrap();
            }
            setToggleTarget(null);
        } catch (submitError) {
            setActionError(typeof submitError === "string" ? submitError : "אירעה שגיאה בעדכון הקטגוריה");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h2 className="h5 mb-0">קטגוריות</h2>
                <button type="button" className="btn btn-primary btn-sm" onClick={openCreateModal}>
                    הוספת קטגוריה
                </button>
            </div>

            {actionError && (
                <div className="alert alert-danger" role="alert">
                    {actionError}
                </div>
            )}

            {status === "loading" && <LoadingSpinner />}
            {status !== "loading" && error && <ErrorMessage message={error} />}
            {status !== "loading" && !error && adminList.length === 0 && <EmptyState title="אין קטגוריות להצגה" />}
            {status !== "loading" && !error && adminList.length > 0 && (
                <ul className="list-group">
                    {adminList.map((category) => (
                        <li key={category._id} className="list-group-item">
                            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                                <div className="d-flex align-items-center gap-2">
                                    <strong>{category.name}</strong>
                                    {!category.isActive && <span className="badge bg-secondary">מושבתת</span>}
                                </div>
                                <div className="d-flex gap-2">
                                    <button
                                        type="button"
                                        className="btn btn-outline-secondary btn-sm"
                                        onClick={() => openEditModal(category)}
                                    >
                                        עריכה
                                    </button>
                                    <button
                                        type="button"
                                        className={`btn btn-sm ${category.isActive ? "btn-outline-danger" : "btn-outline-success"}`}
                                        onClick={() => setToggleTarget(category)}
                                    >
                                        {category.isActive ? "השבתה" : "הפעלה מחדש"}
                                    </button>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {modalOpen && <CategoryModal category={editingCategory} onClose={() => setModalOpen(false)} />}

            <ConfirmDialog
                show={!!toggleTarget}
                title={toggleTarget?.isActive ? "השבתת קטגוריה" : "הפעלת קטגוריה מחדש"}
                message={
                    toggleTarget?.isActive
                        ? `להשבית את הקטגוריה "${toggleTarget?.name}"? היא לא תוצג יותר לבחירה עד להפעלה מחדש.`
                        : `להפעיל מחדש את הקטגוריה "${toggleTarget?.name}"?`
                }
                confirmLabel={isProcessing ? "מעדכן..." : "אישור"}
                onConfirm={handleConfirmToggle}
                onCancel={() => setToggleTarget(null)}
            />
        </div>
    );
};

export default AdminCategories;
