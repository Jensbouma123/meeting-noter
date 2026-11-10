import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Check } from "lucide-react";
import { forwardRef } from "react";
import { cn } from "../../lib/utils.js";
const dotClasses = {
    // Solid brand fill: brand-foreground is a text-role colour, so it clears 3:1 (SC 1.4.11).
    completed: "bg-brand-foreground",
    // Larger than the other dots, so the current step is not colour-only (SC 1.4.1).
    current: "size-2.5 bg-brand-foreground",
    // Hollow ring in full-opacity muted-foreground: shape, not colour, tells it apart.
    upcoming: "border-2 border-muted-foreground",
};
const chipClasses = {
    completed: "border-border bg-surface text-foreground",
    current: "border-brand-foreground bg-brand-foreground/10 font-semibold text-foreground",
    upcoming: "border-border text-muted-foreground",
};
function stateOf(index, current) {
    if (index < current)
        return "completed";
    if (index === current)
        return "current";
    return "upcoming";
}
export const Stepper = forwardRef(function Stepper({ steps, current, variant = "dots", className, ...props }, ref) {
    if (steps.length === 0)
        return null;
    const clamped = Number.isFinite(current)
        ? Math.min(Math.max(Math.floor(current), 0), steps.length - 1)
        : 0;
    return (_jsx("nav", { ref: ref, ...props, "aria-label": `Step ${clamped + 1} of ${steps.length}: ${steps[clamped]}`, className: cn(className), children: _jsx("ol", { className: cn("flex items-center", variant === "dots" ? "gap-2" : "flex-wrap gap-2"), children: steps.map((label, index) => {
                const state = stateOf(index, clamped);
                const isCurrent = index === clamped;
                if (variant === "dots") {
                    return (_jsxs("li", { "aria-current": isCurrent ? "step" : undefined, className: "inline-flex items-center", children: [_jsx("span", { "aria-hidden": "true", className: cn("size-2 shrink-0 rounded-full", dotClasses[state]) }), _jsxs("span", { className: "sr-only", children: [`Step ${index + 1}: ${label}`, state === "completed" ? " (completed)" : isCurrent ? " (current step)" : ""] })] }, index));
                }
                return (_jsx("li", { "aria-current": isCurrent ? "step" : undefined, className: "inline-flex min-w-0 items-center", children: _jsxs("span", { className: cn("inline-flex max-w-40 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium", chipClasses[state]), children: [state === "completed" ? (_jsx(Check, { "aria-hidden": "true", className: "size-3.5 shrink-0 text-success", strokeWidth: 3 })) : null, _jsx("span", { className: "truncate", children: label }), state !== "upcoming" ? (_jsx("span", { className: "sr-only", children: state === "completed" ? " (completed)" : " (current step)" })) : null] }) }, index));
            }) }) }));
});
