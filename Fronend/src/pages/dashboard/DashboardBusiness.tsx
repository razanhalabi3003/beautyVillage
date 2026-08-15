import { FC, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../redux/hooks";
import { updateMyBusiness } from "../../redux/businessesSlice";
import BusinessForm, { BusinessFormValues, businessToFormValues } from "../../Componnents/BusinessForm";
import { isSuspended } from "../../utils/businessStatus";

// Business is guaranteed non-null here - DashboardLayout gates rendering of
// this whole route subtree until state.businesses.mine is loaded.
const DashboardBusiness: FC = () => {
    const dispatch = useAppDispatch();
    const business = useAppSelector((state) => state.businesses.mine)!;
    const [serverError, setServerError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const handleSubmit = async (values: BusinessFormValues) => {
        setServerError(null);
        setSuccessMessage(null);
        try {
            await dispatch(updateMyBusiness({ id: business._id, data: values })).unwrap();
            setSuccessMessage("פרטי העסק עודכנו בהצלחה");
        } catch (submitError) {
            setServerError(typeof submitError === "string" ? submitError : "אירעה שגיאה בעדכון פרטי העסק");
        }
    };

    return (
        <div>
            <h2 className="h5 mb-3">פרטי העסק</h2>

            {business.approvalStatus === "rejected" && (
                <div className="alert alert-danger">
                    <p className="mb-1">
                        <strong>בקשת העסק נדחתה</strong>
                        {business.rejectionReason && <>: {business.rejectionReason}</>}
                    </p>
                    <p className="mb-0 small">שמירת שינויים כאן תגיש את העסק מחדש לאישור מנהל המערכת.</p>
                </div>
            )}
            {isSuspended(business) && (
                <div className="alert alert-warning">
                    העסק מושהה על ידי מנהל המערכת ואינו מוצג לציבור. לא ניתן להפעיל אותו מחדש מכאן - ניתן עדיין
                    לערוך את הפרטים.
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
                defaultValues={businessToFormValues(business)}
                onSubmit={handleSubmit}
                submitLabel="שמירת שינויים"
                submittingLabel="שומר..."
            />
        </div>
    );
};

export default DashboardBusiness;
