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
/** Minimum length classes per spacing tier — applied on both axes. */
const MIN_LENGTH = {
    none: "",
    xxs: "min-w-2 min-h-2",
    xs: "min-w-3 min-h-3",
    sm: "min-w-4 min-h-4",
    md: "min-w-5 min-h-5",
    lg: "min-w-6 min-h-6",
    xl: "min-w-8 min-h-8",
    "2xl": "min-w-10 min-h-10",
    "3xl": "min-w-14 min-h-14",
};
export const Spacer = forwardRef(function Spacer(_a, ref) {
    var { minLength = "md", className } = _a, props = __rest(_a, ["minLength", "className"]);
    return (_jsx("div", Object.assign({ ref: ref, "aria-hidden": "true", className: cn("flex-1 self-stretch", MIN_LENGTH[minLength], className) }, props)));
});
