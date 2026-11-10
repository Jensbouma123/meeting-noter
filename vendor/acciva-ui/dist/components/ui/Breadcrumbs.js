var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
import { jsx as _jsx } from "react/jsx-runtime";
import { ChevronRight } from "lucide-react";
import { forwardRef } from "react";
import { cn } from "../../lib/utils.js";
export const Breadcrumbs = forwardRef(function Breadcrumbs(_a, ref) {
    var { separator = _jsx(ChevronRight, { className: "size-3.5 text-muted-foreground" }), className, children } = _a, props = __rest(_a, ["separator", "className", "children"]);
    return (_jsx("nav", Object.assign({ ref: ref, "aria-label": "Breadcrumb", className: cn("flex items-center text-sm text-muted-foreground", className) }, props, { children: _jsx("ol", { className: "flex flex-wrap items-center gap-2", children: children }) })));
});
export const BreadcrumbItem = forwardRef(function BreadcrumbItem(_a, ref) {
    var { href, isCurrent = false, className, children } = _a, props = __rest(_a, ["href", "isCurrent", "className", "children"]);
    return (_jsx("li", Object.assign({ ref: ref, className: cn("inline-flex items-center gap-2", className) }, props, { children: href && !isCurrent ? (_jsx("a", { href: href, className: "focus-ring rounded font-medium text-muted-foreground transition-colors motion-feedback hover:text-foreground active:text-foreground active:underline", children: children })) : (_jsx("span", { "aria-current": isCurrent ? "page" : undefined, className: cn("font-medium", isCurrent ? "text-foreground font-semibold" : "text-muted-foreground"), children: children })) })));
});
export function BreadcrumbSeparator({ children = _jsx(ChevronRight, { className: "size-3.5 text-muted-foreground" }), className }) {
    return (_jsx("li", { "aria-hidden": "true", className: cn("inline-flex items-center shrink-0 opacity-70", className), children: children }));
}
