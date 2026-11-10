import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef } from "react";
import { cn } from "../../../lib/utils.js";
import { getTruncateClass, headingAlignClasses, headingFontClasses, headingSizeClasses, headingVariantClasses, headingWeightClasses, } from "./classes.js";
const defaultLevelSizes = {
    1: "2xl",
    2: "xl",
    3: "lg",
    4: "md",
    5: "sm",
    6: "xs",
};
export const Heading = forwardRef(function Heading({ as, level = 1, size, weight = "bold", align = "left", variant, color, font = "sans", truncate = false, className, children, ...props }, ref) {
    const Component = (as ?? `h${level}`);
    const resolvedSize = size ?? defaultLevelSizes[level];
    const resolvedVariant = variant ?? color ?? "default";
    return (_jsx(Component, { ref: ref, className: cn("text-balance wrap-break-word", headingSizeClasses[resolvedSize], headingWeightClasses[weight], headingAlignClasses[align], headingVariantClasses[resolvedVariant], headingFontClasses[font], getTruncateClass(truncate), className), ...props, children: children }));
});
