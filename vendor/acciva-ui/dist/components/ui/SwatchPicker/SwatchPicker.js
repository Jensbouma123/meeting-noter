"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef, useId, useRef } from "react";
import { cn } from "../../../lib/utils.js";
import { VStack } from "../VStack.js";
import { resolveOptions } from "./options.js";
import { SwatchOptionButton } from "./SwatchPickerParts.js";
import { useSwatchKeyboard } from "./useSwatchKeyboard.js";
import { useSwatchSelection } from "./useSwatchSelection.js";
export const SwatchPicker = forwardRef(function SwatchPicker({ options, value, defaultValue = null, onChange, label, hint, error, required = false, disabled = false, name, orientation = "horizontal", size = "md", className, onKeyDown, "aria-label": ariaLabel, "aria-labelledby": ariaLabelledBy, "aria-describedby": ariaDescribedBy, ...rest }, ref) {
    const generatedId = useId();
    const labelId = `${generatedId}-label`;
    const hintId = hint && !error ? `${generatedId}-hint` : undefined;
    const errorId = error ? `${generatedId}-error` : undefined;
    const describedByIds = [ariaDescribedBy, hintId, errorId].filter(Boolean).join(" ") || undefined;
    const resolved = resolveOptions(options);
    const optionRefs = useRef([]);
    const [current, activeIndex, select, setFocusIndex] = useSwatchSelection(resolved, value, defaultValue, onChange, disabled);
    const handleKeyDown = useSwatchKeyboard(resolved.length, activeIndex, disabled, optionRefs, select, onKeyDown);
    return (_jsxs(VStack, { spacing: "sm", className: cn("w-full", className), children: [label ? (_jsxs("span", { id: labelId, className: "text-sm font-medium text-foreground", children: [label, required ? _jsx("span", { className: "ml-0.5 text-danger", children: "*" }) : null] })) : null, _jsx("div", { ...rest, ref: ref, role: "radiogroup", "aria-label": label ? undefined : ariaLabel, "aria-labelledby": label ? labelId : ariaLabelledBy, "aria-describedby": describedByIds, "aria-required": required || undefined, "aria-invalid": error ? true : undefined, "aria-orientation": orientation, onKeyDown: handleKeyDown, className: cn("flex", orientation === "horizontal" ? "flex-row flex-wrap gap-3" : "flex-col gap-3"), children: resolved.map((option, index) => (_jsx(SwatchOptionButton, { option: option, selected: option.hex === current, tabbable: index === activeIndex, disabled: disabled, size: size, buttonRef: (node) => {
                        optionRefs.current[index] = node;
                    }, onSelect: () => select(index), onFocus: () => setFocusIndex(index) }, option.key))) }), name && current ? _jsx("input", { type: "hidden", name: name, value: current }) : null, error ? (_jsx("p", { role: "alert", id: errorId, className: "text-xs font-medium text-danger animate-fade-in", children: error })) : hint ? (_jsx("p", { id: hintId, className: "text-xs text-muted-foreground", children: hint })) : null] }));
});
