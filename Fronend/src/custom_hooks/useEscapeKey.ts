import { useEffect, useRef } from "react";

// Shared by all modal components so Escape closes whichever one is open,
// without each modal hand-rolling its own listener. Uses a ref for the
// callback so callers don't need to memoize onClose/onCancel themselves -
// none of this codebase's modal call sites do today.
const useEscapeKey = (onEscape: () => void, enabled = true): void => {
    const callbackRef = useRef(onEscape);
    callbackRef.current = onEscape;

    useEffect(() => {
        if (!enabled) {
            return;
        }
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                callbackRef.current();
            }
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [enabled]);
};

export default useEscapeKey;
