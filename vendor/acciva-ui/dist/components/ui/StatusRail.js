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
import { cn } from "../../lib/utils.js";
const toneClasses = {
    neutral: "bg-border-control",
    info: "bg-info",
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-danger",
};
/**
 * Decorative edge accent. The parent must be `relative`. It is always `aria-hidden`, so the state
 * it signals must also be text or a named icon in the same surface (SC 1.4.1).
 */
export function StatusRail(_a) {
    var { tone = "neutral", orientation = "vertical", inset = true, className } = _a, props = __rest(_a, ["tone", "orientation", "inset", "className"]);
    return (_jsx("span", Object.assign({}, props, { "aria-hidden": "true", role: undefined, className: cn("pointer-events-none absolute", toneClasses[tone], orientation === "vertical"
            ? cn("start-0 w-status-rail", inset ? "inset-y-1" : "inset-y-0")
            : "inset-x-0 top-0 h-status-rail", className) })));
}
