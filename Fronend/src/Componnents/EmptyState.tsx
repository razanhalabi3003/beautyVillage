import { FC, ReactNode } from "react";

interface EmptyStateProps {
    title?: string;
    description?: string;
    action?: ReactNode;
}

const EmptyState: FC<EmptyStateProps> = ({ title = "לא נמצאו תוצאות", description, action }) => (
    <div className="text-center py-5 text-muted">
        <p className="fs-5 mb-1">{title}</p>
        {description && <p className="mb-3">{description}</p>}
        {action}
    </div>
);

export default EmptyState;
