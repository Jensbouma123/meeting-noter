"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ChevronDown } from "lucide-react";
import { createContext, forwardRef, useContext, useId, } from "react";
import { cn } from "../../../lib/utils.js";
import { CONTENT_CHROME, ITEM_CHROME, TRIGGER_CHROME } from "./AccordionChrome.js";
import { useAccordionContext } from "./AccordionContext.js";
const AccordionItemContext = createContext(null);
function useAccordionItemContext(component) {
    const ctx = useContext(AccordionItemContext);
    if (!ctx) {
        throw new Error(`<${component}> must be used within <AccordionItem>`);
    }
    return ctx;
}
export const AccordionItem = forwardRef(function AccordionItem({ value, disabled = false, className, children, ...props }, ref) {
    const { expandedValues, variant } = useAccordionContext("AccordionItem");
    const isExpanded = expandedValues.has(value);
    const baseId = useId();
    const triggerId = `${baseId}-trigger`;
    const contentId = `${baseId}-content`;
    return (_jsx(AccordionItemContext.Provider, { value: { value, isExpanded, triggerId, contentId, disabled }, children: _jsx("div", { ref: ref, className: cn(ITEM_CHROME[variant], className), ...props, children: children }) }));
});
export const AccordionTrigger = forwardRef(function AccordionTrigger({ className, children, trailing, ...props }, ref) {
    const { toggleValue, variant } = useAccordionContext("AccordionTrigger");
    const { value, isExpanded, triggerId, contentId, disabled } = useAccordionItemContext("AccordionTrigger");
    const plain = variant === "plain";
    const chevron = (_jsx(ChevronDown, { "aria-hidden": "true", className: cn("size-4 shrink-0 text-muted-foreground transition-transform motion-feedback", isExpanded && "rotate-180") }));
    return (_jsx("h3", { className: "flex", children: _jsxs("button", { ref: ref, id: triggerId, type: "button", "data-accordion-trigger": "true", "aria-expanded": isExpanded, "aria-controls": contentId, disabled: disabled, onClick: () => toggleValue(value), className: cn("focus-ring flex w-full items-center text-left text-sm font-semibold text-foreground transition-colors", TRIGGER_CHROME[variant], disabled && "cursor-not-allowed opacity-60", className), ...props, children: [plain && chevron, _jsx("span", { className: cn(plain && "flex-1"), children: children }), trailing, !plain && chevron] }) }));
});
export const AccordionContent = forwardRef(function AccordionContent({ className, children, ...props }, ref) {
    const { isExpanded, triggerId, contentId } = useAccordionItemContext("AccordionContent");
    const { variant } = useAccordionContext("AccordionContent");
    return (_jsx("div", { ref: ref, id: contentId, role: "region", "aria-labelledby": triggerId, hidden: !isExpanded, className: cn("overflow-hidden transition-all motion-spatial", isExpanded ? "animate-fade-in block" : "hidden", className), ...props, children: _jsx("div", { className: cn(CONTENT_CHROME[variant], "text-sm text-foreground"), children: children }) }));
});
