import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef } from "react";
import { TEXT_SIZE } from "../../lib/sizing-tokens/index.js";
import { cn } from "../../lib/utils.js";
const textSizeClasses = {
    caption: "text-xs leading-normal",
    "3xs": `${TEXT_SIZE["3xs"]} leading-tight`,
    xxs: `${TEXT_SIZE.xxs} leading-tight`,
    xs: "text-xs leading-normal",
    sm: "text-sm leading-normal",
    md: "text-base leading-relaxed",
    lg: "text-lg leading-relaxed",
    xl: "text-xl leading-relaxed",
    "2xl": "text-2xl leading-snug",
    "3xl": "text-3xl leading-snug",
};
const textVariantClasses = {
    default: "text-foreground",
    muted: "text-muted-foreground",
    subtle: "text-subtle-foreground",
    primary: "text-primary-600 dark:text-primary-400",
    success: "text-success",
    warning: "text-warning",
    danger: "text-danger",
    inherit: "text-inherit",
};
const textWeightClasses = {
    light: "font-light",
    normal: "font-normal",
    medium: "font-medium",
    semibold: "font-semibold",
    bold: "font-bold",
    extrabold: "font-extrabold",
    black: "font-black",
};
const textAlignClasses = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
    justify: "text-justify",
};
const textFontClasses = {
    sans: "font-sans",
    serif: "font-serif",
    mono: "font-mono",
    display: "font-display tracking-tight",
    custom: "font-custom",
};
function getTruncateClass(truncate) {
    if (!truncate)
        return "";
    if (truncate === true || truncate === 1)
        return "truncate";
    if (truncate === 2)
        return "line-clamp-2";
    if (truncate === 3)
        return "line-clamp-3";
    return "";
}
export const Text = forwardRef(function Text({ as = "p", size = "md", variant = "default", weight = "normal", align = "left", font = "sans", truncate = false, className, children, ...props }, ref) {
    const Component = as;
    return (_jsx(Component, { ref: ref, className: cn(textSizeClasses[size], textVariantClasses[variant], textWeightClasses[weight], textAlignClasses[align], textFontClasses[font], getTruncateClass(truncate), className), ...props, children: children }));
});
