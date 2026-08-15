import { FC } from "react";
import useEscapeKey from "../custom_hooks/useEscapeKey";

interface ConfirmDialogProps {
    show: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
}

// Manually controlled via the `show` prop rather than Bootstrap's modal JS -
// keeps visibility fully React-owned instead of juggling an imperative API.
const ConfirmDialog: FC<ConfirmDialogProps> = ({
    show,
    title,
    message,
    confirmLabel = "אישור",
    cancelLabel = "ביטול",
    onConfirm,
    onCancel,
}) => {
    // Called on every render regardless of `show` (Rules of Hooks) - the
    // `enabled` flag inside the hook is what actually gates the listener.
    useEscapeKey(onCancel, show);

    if (!show) {
        return null;
    }

    return (
        <>
            <div className="modal d-block" tabIndex={-1} role="dialog" aria-modal="true">
                <div className="modal-dialog modal-dialog-centered" role="document">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">{title}</h5>
                            <button type="button" className="btn-close" aria-label="סגור" onClick={onCancel} />
                        </div>
                        <div className="modal-body">
                            <p className="mb-0">{message}</p>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-outline-secondary" onClick={onCancel}>
                                {cancelLabel}
                            </button>
                            <button type="button" className="btn btn-primary" onClick={onConfirm}>
                                {confirmLabel}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <div className="modal-backdrop show" />
        </>
    );
};

export default ConfirmDialog;
