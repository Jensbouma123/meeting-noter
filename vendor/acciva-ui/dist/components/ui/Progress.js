import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef } from "react";
import { cn } from "../../lib/utils.js";
// The indicator paints `currentColor`, so one map serves the linear fill and the circular stroke.
const toneClasses = {
    brand: "text-brand-foreground",
    info: "text-info",
    success: "text-success",
    warning: "text-warning",
    danger: "text-danger",
};
// Literal class names so Tailwind's scanner sees every utility; `text-chart-N` maps to `--chart-N`.
const seriesClasses = {
    1: "text-chart-1",
    2: "text-chart-2",
    3: "text-chart-3",
    4: "text-chart-4",
    5: "text-chart-5",
    6: "text-chart-6",
    7: "text-chart-7",
    8: "text-chart-8",
};
/** Arc shown while circular progress is indeterminate, as a share of the ring. */
const INDETERMINATE_ARC = 25;
export const Progress = forwardRef(function Progress({ label, value, max = 100, variant = "linear", tone = "brand", series, valueText, className, ...props }, ref) {
    const determinate = value !== undefined && Number.isFinite(value) && max > 0;
    const now = determinate ? Math.min(Math.max(value, 0), max) : undefined;
    const percent = now === undefined ? undefined : (now / max) * 100;
    const colorClass = series === undefined ? toneClasses[tone] : seriesClasses[series];
    const a11y = {
        role: "progressbar",
        "aria-label": label,
        "aria-valuemin": determinate ? 0 : undefined,
        "aria-valuemax": determinate ? max : undefined,
        "aria-valuenow": now,
        "aria-valuetext": determinate ? valueText : undefined,
    };
    if (variant === "circular") {
        return (_jsx("div", { ref: ref, ...props, ...a11y, className: cn("size-6 shrink-0", colorClass, percent === undefined && "animate-spin motion-reduce:animate-none", className), children: _jsxs("svg", { viewBox: "0 0 24 24", fill: "none", strokeWidth: 3, "aria-hidden": "true", className: "size-full -rotate-90", children: [_jsx("circle", { cx: 12, cy: 12, r: 10, className: "stroke-muted-foreground/20" }), _jsx("circle", { cx: 12, cy: 12, r: 10, stroke: "currentColor", strokeLinecap: "round", pathLength: 100, strokeDasharray: 100, strokeDashoffset: 100 - (percent ?? INDETERMINATE_ARC), className: "transition-all motion-spatial motion-reduce:transition-none" })] }) }));
    }
    return (_jsx("div", { ref: ref, ...props, ...a11y, className: cn("h-1.5 w-full overflow-hidden rounded-full bg-muted-foreground/20", colorClass, className), children: _jsx("div", { className: cn("h-full rounded-full bg-current", percent === undefined
                ? "w-1/3 animate-pulse motion-reduce:animate-none"
                : "transition-all motion-spatial motion-reduce:transition-none"), style: percent === undefined ? undefined : { width: `${percent}%` } }) }));
});
