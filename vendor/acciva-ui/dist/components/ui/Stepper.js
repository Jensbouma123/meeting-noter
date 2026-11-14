"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef } from "react";
import { cn } from "../../lib/utils.js";
import { StepperItem, stateOf } from "./Stepper/StepperItem.js";
export const Stepper = forwardRef(function Stepper({ steps, current, variant = "dots", onStepRequest, isStepAllowed, className, ...props }, ref) {
    if (steps.length === 0)
        return null;
    const clamped = Number.isFinite(current)
        ? Math.min(Math.max(Math.floor(current), 0), steps.length - 1)
        : 0;
    const collapse = onStepRequest !== undefined && variant === "chips";
    return (_jsxs("nav", { ref: ref, ...props, "aria-label": `Step ${clamped + 1} of ${steps.length}: ${steps[clamped]}`, className: cn(className), children: [collapse ? (
            // aria-hidden: the nav's accessible name already says this (SC 1.3.1, no duplicate).
            _jsx("p", { "aria-hidden": "true", className: "mb-1 text-xs font-medium text-muted-foreground sm:hidden", children: `Step ${clamped + 1} of ${steps.length}` })) : null, _jsx("ol", { className: cn("flex items-center gap-2", variant === "chips" && "flex-wrap"), children: steps.map((label, index) => {
                    const state = stateOf(index, clamped);
                    const requestable = onStepRequest !== undefined &&
                        state !== "current" &&
                        (state === "completed" || isStepAllowed?.(index) === true);
                    return (_jsx(StepperItem, { label: label, index: index, state: state, variant: variant, onRequest: requestable ? () => onStepRequest(index) : undefined }, index));
                }) })] }));
});
