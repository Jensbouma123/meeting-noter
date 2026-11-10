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
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef } from "react";
import { cn } from "../../lib/utils.js";
/**
 * A bottom action bar: a `border` top rule over a `surface` row. `px-safe` and `pb-safe`
 * pad the bar over the safe area, so the background bleeds under the home indicator while
 * the row stays clear of it (see [[pwa]]). `ml-auto` pins the trailing group to the end edge.
 */
export const FooterBar = forwardRef(function FooterBar(_a, ref) {
    var { leading, trailing, className } = _a, props = __rest(_a, ["leading", "trailing", "className"]);
    return (_jsx("footer", Object.assign({ ref: ref, className: cn("border-t border-border bg-surface px-safe pb-safe", className) }, props, { children: _jsxs("div", { className: "flex min-h-14 items-center gap-2 px-4", children: [_jsx("div", { className: "flex min-w-0 items-center gap-1", children: leading }), _jsx("div", { className: "ml-auto flex min-w-0 items-center gap-1", children: trailing })] }) })));
});
