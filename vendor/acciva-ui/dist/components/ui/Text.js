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
import { TEXT_SIZE } from "../../lib/sizing-tokens.js";
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
export const Text = forwardRef(function Text(_a, ref) {
    var { as = "p", size = "md", variant = "default", weight = "normal", align = "left", font = "sans", truncate = false, className, children } = _a, props = __rest(_a, ["as", "size", "variant", "weight", "align", "font", "truncate", "className", "children"]);
    const Component = as;
    return (_jsx(Component, Object.assign({ ref: ref, className: cn(textSizeClasses[size], textVariantClasses[variant], textWeightClasses[weight], textAlignClasses[align], textFontClasses[font], getTruncateClass(truncate), className) }, props, { children: children })));
});
