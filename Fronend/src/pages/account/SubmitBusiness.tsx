import { FC, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../redux/hooks";
import { fetchMyBusiness, createMyBusiness, updateMyBusiness } from "../../redux/businessesSlice";
import BusinessForm, { BusinessFormValues, businessToFormValues, emptyBusinessFormValues } from "../../Componnents/BusinessForm";
import LoadingSpinner from "../../Componnents/LoadingSpinner";
import ErrorMessage from "../../Componnents/ErrorMessage";
import { approvalStatusLabels, approvalStatusColors } from "../../utils/businessStatus";

// Serves all three non-approved states through one page: no business yet
// (create form), pending (editable status page), rejected (editable status
// page that resubmits on save). An approved business redirects to /dashboard
// instead of rendering here - suspension is handled there, not here.
const SubmitBusiness: FC = () => {
    const dispatch = useAppDispatch();
    const business = useAppSelector((state) => state.businesses.mine);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [serverError, setServerError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    useEffect(() => {
        setIsLoading(true);
        dispatch(fetchMyBusiness())
            .unwrap()
            .catch(() => setLoadError("שגיאה בבדיקת סטטוס העסק"))
            .finally(() => setIsLoading(false));
    }, [dispatch]);

    const handleCreate = async (values: BusinessFormValues) => {
        setServerError(null);
        setSuccessMessage(null);
        try {
            await dispatch(createMyBusiness(values)).unwrap();
            setSuccessMessage("הבקשה נשלחה לאישור");
        } catch (submitError) {
            setServerError(typeof submitError === "string" ? submitError : "אירעה שגיאה בשליחת הבקשה");
        }
    };

    const handleUpdate = async (values: BusinessFormValues) => {
        if (!business) {
            return;
        }
        setServerError(null);
        setSuccessMessage(null);
        try {
            await dispatch(updateMyBusiness({ id: business._id, data: values })).unwrap();
            setSuccessMessage(
                business.approvalStatus === "rejected" ? "הבקשה נשלחה מחדש לאישור" : "הפרטים עודכנו בהצלחה"
            );
        } catch (submitError) {
            setServerError(typeof submitError === "string" ? submitError : "אירעה שגיאה בעדכון הפרטים");
        }
    };

    if (isLoading) {
        return <LoadingSpinner label="בודק אם כבר יש לך עסק רשום..." />;
    }
    if (loadError) {
        return <ErrorMessage message={loadError} />;
    }

    // Covers both a fully approved business and a suspended one (still
    // approvalStatus "approved") - either way this page has nothing further
    // to offer, the dashboard is the right place from here on.
    if (business?.approvalStatus === "approved") {
        return <Navigate to="/dashboard" replace />;
    }

    return (
        <div className="container" style={{ maxWidth: "640px" }}>
            <h1 className="h4 mb-3">{business ? "העסק שלי" : "הוספת עסק חדש"}</h1>

            {business && (
                <span
                    className="badge rounded-pill d-inline-block mb-3"
                    style={{ backgroundColor: "var(--bv-bg-alt)", color: approvalStatusColors[business.approvalStatus] }}
                >
                    {approvalStatusLabels[business.approvalStatus]}
                </span>
            )}

            {business?.approvalStatus === "pending" && (
                <div className="alert alert-info">
                    הבקשה שלכם ממתינה לבדיקה על ידי מנהל המערכת. ניתן לערוך את הפרטים בזמן ההמתנה.
                </div>
            )}
            {business?.approvalStatus === "rejected" && (
                <div className="alert alert-danger">
                    <p className="mb-1">
                        <strong>הבקשה נדחתה</strong>
                        {business.rejectionReason && <>: {business.rejectionReason}</>}
                    </p>
                    <p className="mb-0 small">עדכון ושמירת הפרטים יגישו את הבקשה מחדש לאישור מנהל המערכת.</p>
                </div>
            )}
            {serverError && (
                <div className="alert alert-danger" role="alert">
                    {serverError}
                </div>
            )}
            {successMessage && (
                <div className="alert alert-success" role="status">
                    {successMessage}
                </div>
            )}

            <BusinessForm
                defaultValues={business ? businessToFormValues(business) : emptyBusinessFormValues}
                onSubmit={business ? handleUpdate : handleCreate}
                submitLabel={business ? "שמירה" : "שליחת בקשה"}
                submittingLabel={business ? "שומר..." : "שולח..."}
            />
        </div>
    );
};

export default SubmitBusiness;
