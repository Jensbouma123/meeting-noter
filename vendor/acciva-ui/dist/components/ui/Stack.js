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
import { forwardRef, } from "react";
import { cn } from "../../lib/utils.js";
// ---------------------------------------------------------------------------
// Lookup tables (token-driven — no ternary class strings)
// ---------------------------------------------------------------------------
/** Gap classes per spacing tier. */
export const SPACING_GAP = {
    none: "gap-0",
    xxs: "gap-0.5",
    xs: "gap-1",
    sm: "gap-2",
    md: "gap-3",
    lg: "gap-4",
    xl: "gap-6",
    "2xl": "gap-8",
    "3xl": "gap-12",
};
/** Inset (padding) classes per spacing tier. */
export const INSET_PADDING = {
    none: "",
    xxs: "p-0.5",
    xs: "p-1",
    sm: "p-2",
    md: "p-3",
    lg: "p-4",
    xl: "p-6",
    "2xl": "p-8",
    "3xl": "p-12",
};
const DIRECTION_CLASS = {
    horizontal: "flex-row",
    vertical: "flex-col",
};
const ALIGN_CLASS = {
    leading: "items-start",
    center: "items-center",
    trailing: "items-end",
    stretch: "items-stretch",
    baseline: "items-baseline",
};
const JUSTIFY_CLASS = {
    leading: "justify-start",
    center: "justify-center",
    trailing: "justify-end",
    between: "justify-between",
    around: "justify-around",
    evenly: "justify-evenly",
};
export const Stack = forwardRef(function Stack(_a, ref) {
    var { as, direction = "vertical", spacing = "md", align, justify = "leading", wrap = false, inset = "none", fill = false, className, children } = _a, props = __rest(_a, ["as", "direction", "spacing", "align", "justify", "wrap", "inset", "fill", "className", "children"]);
    const Component = (as !== null && as !== void 0 ? as : "div");
    return (_jsx(Component, Object.assign({ ref: ref, className: cn("flex", DIRECTION_CLASS[direction], align && ALIGN_CLASS[align], JUSTIFY_CLASS[justify], SPACING_GAP[spacing], wrap && "flex-wrap", INSET_PADDING[inset], fill && "min-w-0 min-h-0 flex-1", className) }, props, { children: children })));
});
