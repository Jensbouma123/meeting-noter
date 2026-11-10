import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef } from "react";
import { cn } from "../../../lib/utils.js";
import { ALIGN_CLASS, DIRECTION_CLASS, INSET_PADDING, JUSTIFY_CLASS, SPACING_GAP, } from "./StackTokens.js";
export const StackBase = forwardRef(function Stack({ as, direction = "vertical", directionClass, spacing = "md", align, justify = "leading", wrap = false, inset = "none", fill = false, className, children, ...props }, ref) {
    const Component = (as ?? "div");
    return (_jsx(Component, { ref: ref, className: cn("flex", directionClass ?? DIRECTION_CLASS[direction], align && ALIGN_CLASS[align], JUSTIFY_CLASS[justify], SPACING_GAP[spacing], wrap && "flex-wrap", INSET_PADDING[inset], fill && "min-w-0 min-h-0 flex-1", className), ...props, children: children }));
});
