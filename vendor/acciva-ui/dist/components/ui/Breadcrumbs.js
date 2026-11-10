import { jsx as _jsx } from "react/jsx-runtime";
import { ChevronRight } from "lucide-react";
import { forwardRef } from "react";
import { cn } from "../../lib/utils.js";
export const Breadcrumbs = forwardRef(function Breadcrumbs({ separator = _jsx(ChevronRight, { className: "size-3.5 text-muted-foreground" }), className, children, ...props }, ref) {
    return (_jsx("nav", { ref: ref, "aria-label": "Breadcrumb", className: cn("flex items-center text-sm text-muted-foreground", className), ...props, children: _jsx("ol", { className: "flex flex-wrap items-center gap-2", children: children }) }));
});
export const BreadcrumbItem = forwardRef(function BreadcrumbItem({ href, isCurrent = false, className, children, ...props }, ref) {
    return (_jsx("li", { ref: ref, className: cn("inline-flex items-center gap-2", className), ...props, children: href && !isCurrent ? (_jsx("a", { href: href, className: "focus-ring rounded font-medium text-muted-foreground transition-colors motion-feedback hover:text-foreground active:text-foreground active:underline", children: children })) : (_jsx("span", { "aria-current": isCurrent ? "page" : undefined, className: cn("font-medium", isCurrent ? "text-foreground font-semibold" : "text-muted-foreground"), children: children })) }));
});
export function BreadcrumbSeparator({ children = _jsx(ChevronRight, { className: "size-3.5 text-muted-foreground" }), className }) {
    return (_jsx("li", { "aria-hidden": "true", className: cn("inline-flex items-center shrink-0 opacity-70", className), children: children }));
}
