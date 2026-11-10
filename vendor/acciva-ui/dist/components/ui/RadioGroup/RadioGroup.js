"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef, useId, useRef } from "react";
import { TEXT_SIZE, resolveResponsive } from "../../../lib/sizing-tokens/index.js";
import { useArrowHint } from "../../../lib/use-arrow-hint.js";
import { cn } from "../../../lib/utils.js";
import { ArrowHint } from "../../../lib/ArrowHint.js";
import { VStack } from "../VStack.js";
import { RadioGroupContext } from "./context.js";
import { useRovingFocus } from "./useRovingFocus.js";
export const RadioGroup = forwardRef(function RadioGroup({ value, onChange, name, label, hint, error, orientation = "vertical", size = "md", disabled = false, required = false, className, children, "aria-label": ariaLabel, "aria-labelledby": ariaLabelledBy, "aria-describedby": ariaDescribedBy, arrowHint, ...props }, ref) {
    const generatedId = useId();
    const groupName = name ?? `${generatedId}-radio-group`;
    const labelId = `${generatedId}-label`;
    const hintId = hint && !error ? `${generatedId}-hint` : undefined;
    const errorId = error ? `${generatedId}-error` : undefined;
    const groupRef = useRef(null);
    const arrowHintState = useArrowHint("radio-group", arrowHint, "Use arrow keys to move between options");
    const describedByIds = arrowHintState.describedBy([ariaDescribedBy, hintId, errorId].filter(Boolean).join(" ") || undefined);
    const handleKeyDown = useRovingFocus(groupRef);
    return (_jsx(RadioGroupContext.Provider, { value: {
            name: groupName,
            value,
            onChange,
            size,
            disabled,
            orientation,
        }, children: _jsxs(VStack, { ref: (element) => {
                const node = element;
                groupRef.current = node;
                if (typeof ref === "function")
                    ref(node);
                else if (ref)
                    ref.current = node;
            }, role: "radiogroup", "aria-label": label ? undefined : ariaLabel, "aria-labelledby": label ? labelId : ariaLabelledBy, "aria-describedby": describedByIds, "aria-required": required || undefined, "aria-orientation": orientation, onKeyDown: handleKeyDown, ...arrowHintState.groupProps, spacing: "sm", className: cn("relative", className), ...props, children: [label ? (_jsxs("span", { id: labelId, className: cn("font-medium text-foreground", resolveResponsive(size, TEXT_SIZE)), children: [label, required ? _jsx("span", { className: "ml-0.5 text-danger", children: "*" }) : null] })) : null, _jsx("div", { className: cn("flex", orientation === "horizontal" ? "flex-row flex-wrap gap-4" : "flex-col gap-2.5"), children: children }), _jsx(ArrowHint, { id: arrowHintState.id, text: arrowHintState.text, visible: arrowHintState.visible }), hint && !error ? (_jsx("p", { id: hintId, className: "text-xs text-muted-foreground", children: hint })) : null, error ? (_jsx("p", { id: errorId, role: "alert", className: "text-xs font-medium text-danger animate-fade-in", children: error })) : null] }) }));
});
