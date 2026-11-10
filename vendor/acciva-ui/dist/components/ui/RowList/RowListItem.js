import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef } from "react";
import { cn } from "../../../lib/utils.js";
export const RowListItem = forwardRef(function RowListItem({ title, meta, leading, trailing, className, ...props }, ref) {
    return (_jsxs("li", { ref: ref, className: cn("flex min-h-11 items-center gap-3 py-2", className), ...props, children: [leading ? _jsx("span", { className: "flex shrink-0 items-center", children: leading }) : null, _jsxs("span", { className: "min-w-0 flex-1", children: [_jsx("span", { className: "block wrap-break-word text-sm font-medium text-foreground", children: title }), meta ? (_jsx("span", { className: "block wrap-break-word text-xs text-muted-foreground", children: meta })) : null] }), trailing ? _jsx("span", { className: "flex shrink-0 items-center", children: trailing }) : null] }));
});
