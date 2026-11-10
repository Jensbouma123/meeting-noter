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
import { forwardRef } from "react";
import { cn } from "../../lib/utils.js";
import { INSET_PADDING, } from "./Stack.js";
/**
 * Block-axis alignment comes from `items-*` and inline-axis alignment from
 * `justify-items-*`, both set on the grid container so no wrapper element is
 * needed per layer.
 */
const ALIGN_CLASS = {
    "top-leading": "items-start justify-items-start",
    top: "items-start justify-items-center",
    "top-trailing": "items-start justify-items-end",
    leading: "items-center justify-items-start",
    center: "items-center justify-items-center",
    trailing: "items-center justify-items-end",
    "bottom-leading": "items-end justify-items-start",
    bottom: "items-end justify-items-center",
    "bottom-trailing": "items-end justify-items-end",
};
/** Every direct child is pinned to the single grid cell, so children overlap. */
const LAYER_CLASS = "*:col-start-1 *:row-start-1";
export const ZStack = forwardRef(function ZStack(_a, ref) {
    var { as, align = "center", inset = "none", className, children } = _a, props = __rest(_a, ["as", "align", "inset", "className", "children"]);
    const Component = (as !== null && as !== void 0 ? as : "div");
    return (_jsx(Component, Object.assign({ ref: ref, className: cn("grid", LAYER_CLASS, ALIGN_CLASS[align], INSET_PADDING[inset], className) }, props, { children: children })));
});
