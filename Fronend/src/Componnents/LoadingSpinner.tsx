import { FC } from "react";

interface LoadingSpinnerProps {
    label?: string;
}

const LoadingSpinner: FC<LoadingSpinnerProps> = ({ label = "טוען..." }) => (
    <div className="d-flex flex-column align-items-center justify-content-center py-5 text-muted">
        <div className="spinner-border" style={{ color: "var(--bv-primary)" }} role="status">
            <span className="visually-hidden">{label}</span>
        </div>
        <p className="mt-3 mb-0">{label}</p>
    </div>
);

export default LoadingSpinner;
