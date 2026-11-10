import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef } from "react";
import { cn } from "../../../lib/utils.js";
export const CardHeader = forwardRef(function CardHeader({ className, children, action, ...props }, ref) {
    return (_jsxs("div", { ref: ref, className: cn("flex items-start justify-between gap-4 pb-3", className), ...props, children: [_jsx("div", { className: "space-y-1 min-w-0 flex-1", children: children }), action ? _jsx("div", { className: "shrink-0 pt-0.5", children: action }) : null] }));
});
export const CardTitle = forwardRef(function CardTitle({ className, children, ...props }, ref) {
    return (_jsx("h3", { ref: ref, className: cn("text-base sm:text-lg font-semibold text-foreground tracking-tight", className), ...props, children: children }));
});
export const CardDescription = forwardRef(function CardDescription({ className, children, ...props }, ref) {
    return (_jsx("p", { ref: ref, className: cn("text-xs sm:text-sm text-muted-foreground", className), ...props, children: children }));
});
export const CardContent = forwardRef(function CardContent({ className, children, ...props }, ref) {
    return (_jsx("div", { ref: ref, className: cn("text-sm text-foreground", className), ...props, children: children }));
});
export const CardFooter = forwardRef(function CardFooter({ className, children, ...props }, ref) {
    return (_jsx("div", { ref: ref, className: cn("flex items-center justify-between gap-3 pt-4 border-t border-border/60", className), ...props, children: children }));
});
