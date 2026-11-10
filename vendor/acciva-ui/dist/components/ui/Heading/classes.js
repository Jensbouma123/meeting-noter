import { TEXT_SIZE } from "../../../lib/sizing-tokens/index.js";
export const headingSizeClasses = {
    display: "text-3xl sm:text-4xl lg:text-6xl tracking-tight leading-tight",
    "3xl": "text-3xl md:text-4xl tracking-tight leading-tight",
    "2xl": "text-2xl md:text-3xl tracking-tight leading-tight",
    xl: "text-xl md:text-2xl tracking-tight leading-snug",
    lg: "text-lg md:text-xl leading-snug",
    md: "text-base md:text-lg leading-normal",
    sm: "text-sm md:text-base leading-normal",
    xs: "text-xs md:text-sm leading-normal",
    xxs: `${TEXT_SIZE.xxs} md:text-xs leading-normal`,
};
export const headingWeightClasses = {
    light: "font-light",
    normal: "font-normal",
    medium: "font-medium",
    semibold: "font-semibold",
    bold: "font-bold",
    extrabold: "font-extrabold",
    black: "font-black",
};
export const headingAlignClasses = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
    justify: "text-justify",
};
export const headingVariantClasses = {
    default: "text-foreground",
    muted: "text-muted-foreground",
    subtle: "text-subtle-foreground",
    primary: "text-primary-600 dark:text-primary-400",
    success: "text-success",
    warning: "text-warning",
    danger: "text-danger",
    inherit: "text-inherit",
};
export const headingFontClasses = {
    sans: "font-sans",
    serif: "font-serif",
    mono: "font-mono",
    display: "font-display tracking-tight",
    custom: "font-custom",
};
export function getTruncateClass(truncate) {
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
