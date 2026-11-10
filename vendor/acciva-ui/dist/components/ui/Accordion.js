"use client";
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
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ChevronDown } from "lucide-react";
import { createContext, forwardRef, useCallback, useContext, useId, useMemo, useRef, useState, } from "react";
import { cn } from "../../lib/utils.js";
// Chrome per variant. `default` is the bordered, filled, divided panel; `plain` is a
// chrome-less inline disclosure row (no border, fill, radius or dividers).
const ROOT_CHROME = {
    default: "divide-y divide-border rounded-xl border border-border bg-surface",
    plain: "",
};
const ITEM_CHROME = {
    default: "overflow-hidden first:rounded-t-xl last:rounded-b-xl",
    plain: "",
};
const TRIGGER_CHROME = {
    default: "justify-between p-4 hover:bg-elevation-2 active:bg-elevation-3 dark:hover:bg-elevation-3 dark:active:bg-elevation-4",
    plain: "min-h-11 gap-2 py-3 hover:underline",
};
const CONTENT_CHROME = {
    default: "px-4 pb-4 pt-1",
    plain: "pb-3 pl-6 pt-1",
};
const AccordionContext = createContext(null);
function useAccordionContext(component) {
    const ctx = useContext(AccordionContext);
    if (!ctx) {
        throw new Error(`<${component}> must be used within <Accordion>`);
    }
    return ctx;
}
export const Accordion = forwardRef(function Accordion(_a, ref) {
    var { type = "single", value: controlledValue, defaultValue, onValueChange, collapsible = true, variant = "default", className, children } = _a, props = __rest(_a, ["type", "value", "defaultValue", "onValueChange", "collapsible", "variant", "className", "children"]);
    const [uncontrolledValue, setUncontrolledValue] = useState(() => {
        if (defaultValue) {
            return new Set(Array.isArray(defaultValue) ? defaultValue : [defaultValue]);
        }
        return new Set();
    });
    const isControlled = controlledValue !== undefined;
    const expandedValues = useMemo(() => {
        return isControlled
            ? new Set(Array.isArray(controlledValue) ? controlledValue : controlledValue ? [controlledValue] : [])
            : uncontrolledValue;
    }, [isControlled, controlledValue, uncontrolledValue]);
    const toggleValue = useCallback((itemValue) => {
        var _a;
        const nextSet = new Set(expandedValues);
        if (type === "single") {
            if (nextSet.has(itemValue)) {
                if (collapsible)
                    nextSet.clear();
            }
            else {
                nextSet.clear();
                nextSet.add(itemValue);
            }
        }
        else {
            if (nextSet.has(itemValue)) {
                nextSet.delete(itemValue);
            }
            else {
                nextSet.add(itemValue);
            }
        }
        if (!isControlled) {
            setUncontrolledValue(nextSet);
        }
        if (onValueChange) {
            const nextArray = Array.from(nextSet);
            onValueChange(type === "single" ? (_a = nextArray[0]) !== null && _a !== void 0 ? _a : "" : nextArray);
        }
    }, [expandedValues, type, collapsible, isControlled, onValueChange]);
    const containerRef = useRef(null);
    const handleKeyDown = (event) => {
        var _a;
        const container = containerRef.current;
        if (!container)
            return;
        const triggers = Array.from(container.querySelectorAll('button[data-accordion-trigger="true"]:not([disabled])'));
        if (triggers.length === 0)
            return;
        const currentIndex = triggers.findIndex((t) => t === document.activeElement);
        if (currentIndex === -1)
            return;
        let nextIndex = null;
        switch (event.key) {
            case "ArrowDown":
                nextIndex = (currentIndex + 1) % triggers.length;
                break;
            case "ArrowUp":
                nextIndex = (currentIndex - 1 + triggers.length) % triggers.length;
                break;
            case "Home":
                nextIndex = 0;
                break;
            case "End":
                nextIndex = triggers.length - 1;
                break;
            default:
                return;
        }
        event.preventDefault();
        (_a = triggers[nextIndex]) === null || _a === void 0 ? void 0 : _a.focus();
    };
    return (_jsx(AccordionContext.Provider, { value: {
            expandedValues,
            toggleValue,
            type,
            collapsible,
            variant,
        }, children: _jsx("div", Object.assign({ ref: (node) => {
                containerRef.current = node;
                if (typeof ref === "function")
                    ref(node);
                else if (ref)
                    ref.current = node;
            }, onKeyDown: handleKeyDown, className: cn(ROOT_CHROME[variant], className) }, props, { children: children })) }));
});
const AccordionItemContext = createContext(null);
function useAccordionItemContext(component) {
    const ctx = useContext(AccordionItemContext);
    if (!ctx) {
        throw new Error(`<${component}> must be used within <AccordionItem>`);
    }
    return ctx;
}
export const AccordionItem = forwardRef(function AccordionItem(_a, ref) {
    var { value, disabled = false, className, children } = _a, props = __rest(_a, ["value", "disabled", "className", "children"]);
    const { expandedValues, variant } = useAccordionContext("AccordionItem");
    const isExpanded = expandedValues.has(value);
    const baseId = useId();
    const triggerId = `${baseId}-trigger`;
    const contentId = `${baseId}-content`;
    return (_jsx(AccordionItemContext.Provider, { value: { value, isExpanded, triggerId, contentId, disabled }, children: _jsx("div", Object.assign({ ref: ref, className: cn(ITEM_CHROME[variant], className) }, props, { children: children })) }));
});
export const AccordionTrigger = forwardRef(function AccordionTrigger(_a, ref) {
    var { className, children, trailing } = _a, props = __rest(_a, ["className", "children", "trailing"]);
    const { toggleValue, variant } = useAccordionContext("AccordionTrigger");
    const { value, isExpanded, triggerId, contentId, disabled } = useAccordionItemContext("AccordionTrigger");
    const plain = variant === "plain";
    const chevron = (_jsx(ChevronDown, { "aria-hidden": "true", className: cn("size-4 shrink-0 text-muted-foreground transition-transform motion-feedback", isExpanded && "rotate-180") }));
    return (_jsx("h3", { className: "flex", children: _jsxs("button", Object.assign({ ref: ref, id: triggerId, type: "button", "data-accordion-trigger": "true", "aria-expanded": isExpanded, "aria-controls": contentId, disabled: disabled, onClick: () => toggleValue(value), className: cn("focus-ring flex w-full items-center text-left text-sm font-semibold text-foreground transition-colors", TRIGGER_CHROME[variant], disabled && "cursor-not-allowed opacity-60", className) }, props, { children: [plain && chevron, _jsx("span", { className: cn(plain && "flex-1"), children: children }), trailing, !plain && chevron] })) }));
});
export const AccordionContent = forwardRef(function AccordionContent(_a, ref) {
    var { className, children } = _a, props = __rest(_a, ["className", "children"]);
    const { isExpanded, triggerId, contentId } = useAccordionItemContext("AccordionContent");
    const { variant } = useAccordionContext("AccordionContent");
    return (_jsx("div", Object.assign({ ref: ref, id: contentId, role: "region", "aria-labelledby": triggerId, hidden: !isExpanded, className: cn("overflow-hidden transition-all motion-spatial", isExpanded ? "animate-fade-in block" : "hidden", className) }, props, { children: _jsx("div", { className: cn(CONTENT_CHROME[variant], "text-sm text-foreground"), children: children }) })));
});
