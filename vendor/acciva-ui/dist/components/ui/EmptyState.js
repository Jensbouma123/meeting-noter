import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Inbox } from "lucide-react";
import { forwardRef } from "react";
import { cn } from "../../lib/utils.js";
const ROOT_PADDING = {
    sm: "py-6 px-4",
    md: "py-12 px-6",
};
const ICON_FRAME = {
    sm: "size-10 mb-3",
    md: "size-14 mb-4",
};
const ICON_SIZE = {
    sm: "size-5",
    md: "size-7",
};
const TITLE_TEXT = {
    sm: "text-sm",
    md: "text-base sm:text-lg",
};
const DESCRIPTION_TEXT = {
    sm: "text-xs",
    md: "text-sm",
};
const ACTIONS_MARGIN = {
    sm: "mt-4",
    md: "mt-6",
};
export const EmptyState = forwardRef(function EmptyState({ icon, title, description, action, secondaryAction, size, compact = false, className, ...props }, ref) {
    const resolvedSize = size ?? (compact ? "sm" : "md");
    return (_jsxs("div", { ref: ref, className: cn("flex flex-col items-center justify-center text-center", ROOT_PADDING[resolvedSize], className), ...props, children: [_jsx("div", { "aria-hidden": "true", className: cn("flex items-center justify-center rounded-2xl bg-elevation-2 text-muted-foreground", ICON_FRAME[resolvedSize]), children: icon ?? _jsx(Inbox, { className: ICON_SIZE[resolvedSize] }) }), _jsx("h3", { className: cn("font-semibold text-foreground tracking-tight", TITLE_TEXT[resolvedSize]), children: title }), description ? (_jsx("p", { className: cn("text-muted-foreground max-w-sm mt-1.5", DESCRIPTION_TEXT[resolvedSize]), children: description })) : null, (action || secondaryAction) ? (_jsxs("div", { className: cn("flex flex-wrap items-center justify-center gap-3", ACTIONS_MARGIN[resolvedSize]), children: [action, secondaryAction] })) : null] }));
});
