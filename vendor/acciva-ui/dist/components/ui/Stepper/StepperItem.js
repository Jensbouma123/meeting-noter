import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { Check } from "lucide-react";
import { cn } from "../../../lib/utils.js";
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
export function stateOf(index, current) {
    if (index < current)
        return "completed";
    if (index === current)
        return "current";
    return "upcoming";
}
const suffix = (state) => state === "completed" ? " (completed)" : state === "current" ? " (current step)" : "";
export function StepperItem({ label, index, state, variant, onRequest }) {
    const isCurrent = state === "current";
    const body = variant === "dots" ? (_jsxs(_Fragment, { children: [_jsx("span", { "aria-hidden": "true", className: cn("size-2 shrink-0 rounded-full", dotClasses[state]) }), _jsx("span", { className: "sr-only", children: `Step ${index + 1}: ${label}${suffix(state)}` })] })) : (_jsxs("span", { className: cn("inline-flex max-w-40 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium", chipClasses[state]), children: [state === "completed" ? (_jsx(Check, { "aria-hidden": "true", className: "size-3.5 shrink-0 text-success", strokeWidth: 3 })) : null, _jsx("span", { className: "truncate", children: label }), state !== "upcoming" ? _jsx("span", { className: "sr-only", children: suffix(state) }) : null] }));
    return (_jsx("li", { "aria-current": isCurrent ? "step" : undefined, className: cn("inline-flex items-center", variant === "chips" && "min-w-0"), children: onRequest ? (
        // Button, not a div: native Enter/Space + focus (SC 2.1.1); 24px floor (SC 2.5.8).
        _jsx("button", { type: "button", onClick: onRequest, className: "focus-ring motion-feedback inline-flex min-h-6 min-w-6 items-center justify-center rounded-full hover:opacity-80", children: body })) : (body) }));
}
