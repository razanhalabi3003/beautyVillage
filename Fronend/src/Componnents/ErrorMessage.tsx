import { FC } from "react";

interface ErrorMessageProps {
    message?: string;
    onRetry?: () => void;
}

const ErrorMessage: FC<ErrorMessageProps> = ({ message = "אירעה שגיאה בטעינת הנתונים", onRetry }) => (
    <div
        className="alert alert-danger d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-2"
        role="alert"
    >
        <span>{message}</span>
        {onRetry && (
            <button type="button" className="btn btn-sm btn-outline-danger" onClick={onRetry}>
                נסה שוב
            </button>
        )}
    </div>
);

export default ErrorMessage;
