import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef } from "react";
import { cn } from "../../lib/utils.js";
/**
 * A bottom action bar: a `border` top rule over a `surface` row. `px-safe` and `pb-safe`
 * pad the bar over the safe area, so the background bleeds under the home indicator while
 * the row stays clear of it (see [[pwa]]). `ml-auto` pins the trailing group to the end edge.
 */
export const FooterBar = forwardRef(function FooterBar({ leading, trailing, className, ...props }, ref) {
    return (_jsx("footer", { ref: ref, className: cn("border-t border-border bg-surface px-safe pb-safe", className), ...props, children: _jsxs("div", { className: "flex min-h-14 items-center gap-2 px-4", children: [_jsx("div", { className: "flex min-w-0 items-center gap-1", children: leading }), _jsx("div", { className: "ml-auto flex min-w-0 items-center gap-1", children: trailing })] }) }));
});
