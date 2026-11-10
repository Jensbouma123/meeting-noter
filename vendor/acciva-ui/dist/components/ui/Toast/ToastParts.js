import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { X } from "lucide-react";
import { useRef } from "react";
import { Button } from "../Button/index.js";
import { VARIANT_ACCENT_TEXT, VARIANT_ICON } from "../variant-tokens.js";
import { cn } from "../../../lib/utils.js";
import { TOAST_BAR } from "./constants.js";
export function ToastCard({ toast, onDismiss, onPause, onResume }) {
    const engagedRef = useRef({ hover: false, focus: false });
    function setEngagement(next) {
        const was = engagedRef.current.hover || engagedRef.current.focus;
        engagedRef.current = { ...engagedRef.current, ...next };
        const is = engagedRef.current.hover || engagedRef.current.focus;
        if (was === is)
            return;
        if (is)
            onPause(toast.id);
        else
            onResume(toast.id);
    }
    const Icon = VARIANT_ICON[toast.variant];
    const { action } = toast;
    const leaving = toast.status === "leaving";
    return (_jsxs("div", { className: cn("pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-xl border border-border bg-surface p-4 pl-5 shadow-lg", "motion-safe:transition-all motion-safe:motion-feedback motion-safe:animate-fade-in", leaving ? "opacity-0 motion-safe:translate-y-1" : "opacity-100 translate-y-0"), onMouseEnter: () => setEngagement({ hover: true }), onMouseLeave: () => setEngagement({ hover: false }), onFocus: () => setEngagement({ focus: true }), onBlur: (event) => {
            if (event.currentTarget.contains(event.relatedTarget))
                return;
            setEngagement({ focus: false });
        }, children: [_jsx("span", { "aria-hidden": "true", "data-toast-bar": true, className: cn("absolute inset-y-0 left-0 w-1", TOAST_BAR[toast.variant]) }), _jsx(Icon, { "aria-hidden": "true", className: cn("mt-0.5 size-5 shrink-0", VARIANT_ACCENT_TEXT[toast.variant]) }), _jsxs("div", { className: "min-w-0 flex-1", children: [toast.title ? _jsx("p", { className: "text-sm font-semibold text-foreground", children: toast.title }) : null, toast.description ? (_jsx("p", { className: cn("text-sm text-muted-foreground", toast.title ? "mt-0.5" : undefined), children: toast.description })) : null, action ? (_jsx("div", { className: "mt-2", children: _jsx(Button, { size: "sm", variant: "outline", onClick: () => {
                                action.onClick();
                                onDismiss(toast.id);
                            }, children: action.label }) })) : null] }), toast.dismissible ? (_jsx(Button, { iconOnly: true, tooltip: "Dismiss notification", variant: "ghost", size: "xxs", className: "-mt-1 -mr-1 shrink-0", onClick: () => onDismiss(toast.id), children: _jsx(X, {}) })) : null] }));
}
