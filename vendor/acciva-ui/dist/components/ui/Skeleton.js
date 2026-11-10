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
// A placeholder block has to darken its parent in light mode and lighten it in dark, which is
// what a tinted foreground does for free — the mode branch stays in the semantic layer instead
// of being hand-written as a `dark:` pair here.
const SKELETON_FILL = "bg-muted-foreground/20";
const variantClasses = {
    text: "h-4 w-full rounded-md",
    circular: "rounded-full aspect-square shrink-0",
    rectangular: "rounded-none w-full",
    rounded: "rounded-xl w-full",
};
export const Skeleton = forwardRef(function Skeleton(_a, ref) {
    var { variant = "text", animation = "pulse", width, height, lines, className, style } = _a, props = __rest(_a, ["variant", "animation", "width", "height", "lines", "className", "style"]);
    const animationClass = animation === "pulse"
        ? "animate-pulse"
        : animation === "shimmer"
            ? "relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-neutral-50/25 before:to-transparent"
            : "";
    const customStyle = Object.assign({ width: typeof width === "number" ? `${width}px` : width, height: typeof height === "number" ? `${height}px` : height }, style);
    if (lines && lines > 1) {
        return (_jsx("div", Object.assign({ ref: ref, className: cn("flex flex-col gap-2 w-full", className) }, props, { children: Array.from({ length: lines }).map((_, i) => (_jsx("div", { "aria-hidden": "true", style: i === lines - 1 && !width ? Object.assign(Object.assign({}, customStyle), { width: "70%" }) : customStyle, className: cn(SKELETON_FILL, variantClasses[variant], animationClass) }, i))) })));
    }
    return (_jsx("div", Object.assign({ ref: ref, "aria-hidden": "true", style: customStyle, className: cn(SKELETON_FILL, variantClasses[variant], animationClass, className) }, props)));
});
