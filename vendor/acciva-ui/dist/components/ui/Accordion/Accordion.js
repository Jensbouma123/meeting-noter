"use client";
import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef } from "react";
import { cn } from "../../../lib/utils.js";
import { ROOT_CHROME } from "./AccordionChrome.js";
import { AccordionContext } from "./AccordionContext.js";
import { useAccordionKeyboard } from "./useAccordionKeyboard.js";
import { useAccordionValue } from "./useAccordionValue.js";
export const Accordion = forwardRef(function Accordion({ type = "single", value: controlledValue, defaultValue, onValueChange, collapsible = true, variant = "default", className, children, ...props }, ref) {
    const { expandedValues, toggleValue } = useAccordionValue(type, collapsible, controlledValue, defaultValue, onValueChange);
    const { containerRef, handleKeyDown } = useAccordionKeyboard();
    return (_jsx(AccordionContext.Provider, { value: {
            expandedValues,
            toggleValue,
            type,
            collapsible,
            variant,
        }, children: _jsx("div", { ref: (node) => {
                containerRef.current = node;
                if (typeof ref === "function")
                    ref(node);
                else if (ref)
                    ref.current = node;
            }, onKeyDown: handleKeyDown, className: cn(ROOT_CHROME[variant], className), ...props, children: children }) }));
});
