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
/**
 * Inset pulls the rule in from the two ends of its own axis, so a horizontal
 * rule insets left/right and a vertical rule insets top/bottom.
 */
const INSET_MARGIN = {
    horizontal: {
        none: "",
        xxs: "mx-0.5",
        xs: "mx-1",
        sm: "mx-2",
        md: "mx-3",
        lg: "mx-4",
        xl: "mx-6",
        "2xl": "mx-8",
        "3xl": "mx-12",
    },
    vertical: {
        none: "",
        xxs: "my-0.5",
        xs: "my-1",
        sm: "my-2",
        md: "my-3",
        lg: "my-4",
        xl: "my-6",
        "2xl": "my-8",
        "3xl": "my-12",
    },
};
/**
 * `border-0` clears the Tailwind preflight `hr { border-top-width: 1px }` rule,
 * so the rule is exactly one `bg-border` pixel and never a doubled edge.
 */
const ORIENTATION_CLASS = {
    horizontal: "h-px w-full border-0",
    vertical: "w-px h-full self-stretch border-0",
};
const ARIA_ORIENTATION = {
    horizontal: "horizontal",
    vertical: "vertical",
};
export const Divider = forwardRef(function Divider(_a, ref) {
    var { orientation = "horizontal", inset = "none", decorative = true, className } = _a, props = __rest(_a, ["orientation", "inset", "decorative", "className"]);
    return (_jsx("hr", Object.assign({ ref: ref, "aria-hidden": decorative || undefined, role: decorative ? undefined : "separator", "aria-orientation": decorative ? undefined : ARIA_ORIENTATION[orientation], className: cn("bg-border", ORIENTATION_CLASS[orientation], INSET_MARGIN[orientation][inset], className) }, props)));
});
