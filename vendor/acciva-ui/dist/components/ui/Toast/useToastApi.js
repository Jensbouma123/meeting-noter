import { useCallback, useMemo } from "react";
import { defaultToastDuration } from "./constants.js";
import { generateToastId } from "./toastState.js";
export function useToastApi({ position, maxVisible, setToasts, requestDismiss, clearAllTimers, }) {
    const addToast = useCallback((variant, options) => {
        const id = generateToastId();
        const toastPosition = options.position ?? position;
        const dismissible = options.dismissible ?? true;
        const duration = options.duration ?? defaultToastDuration(variant, !!options.action);
        const createdAt = Date.now();
        if (process.env.NODE_ENV !== "production" && !dismissible && !Number.isFinite(duration) && !options.action) {
            console.warn("[Toast] a non-dismissible toast with duration: Infinity and no action can never be closed by the user.");
        }
        setToasts((prev) => {
            const visibleCount = prev.filter((t) => t.position === toastPosition && t.status === "visible").length;
            const status = visibleCount < maxVisible ? "visible" : "queued";
            const record = {
                id,
                variant,
                title: options.title,
                description: options.description,
                action: options.action,
                dismissible,
                position: toastPosition,
                duration,
                createdAt,
                status,
            };
            return [...prev, record];
        });
        return id;
    }, [position, maxVisible, setToasts]);
    const dismissAll = useCallback(() => {
        clearAllTimers();
        setToasts([]);
    }, [clearAllTimers, setToasts]);
    const toastFn = useMemo(() => {
        const call = (options) => addToast(options.variant ?? "info", options);
        return Object.assign(call, {
            success: (message, opts) => addToast("success", { ...opts, title: message }),
            danger: (message, opts) => addToast("danger", { ...opts, title: message }),
            warning: (message, opts) => addToast("warning", { ...opts, title: message }),
            info: (message, opts) => addToast("info", { ...opts, title: message }),
        });
    }, [addToast]);
    return useMemo(() => ({ toast: toastFn, dismiss: requestDismiss, dismissAll }), [toastFn, requestDismiss, dismissAll]);
}
