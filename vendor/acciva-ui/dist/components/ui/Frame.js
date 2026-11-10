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
import { FRAME_MAX_WIDTH } from "../../lib/layout-tokens.js";
import { cn } from "../../lib/utils.js";
import { INSET_PADDING } from "./Stack.js";
const ALIGN_CLASS = {
    leading: "items-start",
    center: "items-center",
    trailing: "items-end",
    stretch: "items-stretch",
    baseline: "items-baseline",
};
export const Frame = forwardRef(function Frame(_a, ref) {
    var { as: Tag = "div", maxWidth = "none", padding = "none", fill = false, center = false, align, className, children } = _a, props = __rest(_a, ["as", "maxWidth", "padding", "fill", "center", "align", "className", "children"]);
    const Component = Tag;
    return (_jsx(Component, Object.assign({ ref: ref, className: cn(FRAME_MAX_WIDTH[maxWidth], INSET_PADDING[padding], fill && "w-full h-full", center && "mx-auto", align && ["flex flex-col", ALIGN_CLASS[align]], className) }, props, { children: children })));
});
