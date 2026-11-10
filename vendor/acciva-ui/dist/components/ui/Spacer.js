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
export const Spacer = forwardRef(function Spacer({ minLength = "md", className, ...props }, ref) {
    return (_jsx("div", { ref: ref, "aria-hidden": "true", className: cn("flex-1 self-stretch", MIN_LENGTH[minLength], className), ...props }));
});
