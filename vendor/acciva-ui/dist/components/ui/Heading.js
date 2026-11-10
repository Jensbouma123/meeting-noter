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
const headingSizeClasses = {
    display: "text-4xl md:text-5xl lg:text-6xl tracking-tight leading-tight",
    "3xl": "text-3xl md:text-4xl tracking-tight leading-tight",
    "2xl": "text-2xl md:text-3xl tracking-tight leading-tight",
    xl: "text-xl md:text-2xl tracking-tight leading-snug",
    lg: "text-lg md:text-xl leading-snug",
    md: "text-base md:text-lg leading-normal",
    sm: "text-sm md:text-base leading-normal",
    xs: "text-xs md:text-sm leading-normal",
    xxs: `${TEXT_SIZE.xxs} md:text-xs leading-normal`,
};
const defaultLevelSizes = {
    1: "2xl",
    2: "xl",
    3: "lg",
    4: "md",
    5: "sm",
    6: "xs",
};
const headingWeightClasses = {
    light: "font-light",
    normal: "font-normal",
    medium: "font-medium",
    semibold: "font-semibold",
    bold: "font-bold",
    extrabold: "font-extrabold",
    black: "font-black",
};
const headingAlignClasses = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
    justify: "text-justify",
};
const headingVariantClasses = {
    default: "text-foreground",
    muted: "text-muted-foreground",
    subtle: "text-subtle-foreground",
    primary: "text-primary-600 dark:text-primary-400",
    success: "text-success",
    warning: "text-warning",
    danger: "text-danger",
    inherit: "text-inherit",
};
const headingFontClasses = {
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
export const Heading = forwardRef(function Heading(_a, ref) {
    var _b;
    var { as, level = 1, size, weight = "bold", align = "left", variant, color, font = "sans", truncate = false, className, children } = _a, props = __rest(_a, ["as", "level", "size", "weight", "align", "variant", "color", "font", "truncate", "className", "children"]);
    const Component = (as !== null && as !== void 0 ? as : `h${level}`);
    const resolvedSize = size !== null && size !== void 0 ? size : defaultLevelSizes[level];
    const resolvedVariant = (_b = variant !== null && variant !== void 0 ? variant : color) !== null && _b !== void 0 ? _b : "default";
    return (_jsx(Component, Object.assign({ ref: ref, className: cn(headingSizeClasses[resolvedSize], headingWeightClasses[weight], headingAlignClasses[align], headingVariantClasses[resolvedVariant], headingFontClasses[font], getTruncateClass(truncate), className) }, props, { children: children })));
});
