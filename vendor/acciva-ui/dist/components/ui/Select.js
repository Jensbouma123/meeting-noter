"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Check, ChevronDown } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useRef, useState, } from "react";
import { cn } from "../../lib/utils.js";
import { HStack } from "./HStack.js";
import { VStack } from "./VStack.js";
const TYPEAHEAD_RESET_MS = 500;
export function Select({ id, options, value, onChange, label, placeholder = "Select an option", disabled = false, "aria-label": ariaLabel, "aria-labelledby": ariaLabelledBy, }) {
    var _a;
    const [open, setOpen] = useState(false);
    const buttonRef = useRef(null);
    const listRef = useRef(null);
    const typeaheadRef = useRef("");
    const typeaheadTimer = useRef(null);
    const baseId = useId();
    const listId = `${baseId}-listbox`;
    const labelId = `${baseId}-label`;
    const buttonId = id !== null && id !== void 0 ? id : `${baseId}-button`;
    const firstEnabledIndex = useCallback((from, delta) => {
        if (options.length === 0)
            return -1;
        let index = from;
        for (let i = 0; i < options.length; i++) {
            if (index >= 0 && index < options.length && !options[index].disabled)
                return index;
            index += delta;
            if (index < 0)
                index = options.length - 1;
            if (index >= options.length)
                index = 0;
        }
        return -1;
    }, [options]);
    const selectedIndex = useMemo(() => options.findIndex((option) => option.value === value), [options, value]);
    const [activeIndex, setActiveIndex] = useState(() => (selectedIndex === -1 ? 0 : selectedIndex));
    const selectedOption = selectedIndex === -1 ? null : options[selectedIndex];
    useEffect(() => {
        if (process.env.NODE_ENV === "production")
            return;
        if (!label && !ariaLabel && !ariaLabelledBy) {
            console.warn("[a11y] <Select> has no accessible name. Pass a label, aria-label, or aria-labelledby so screen readers can announce the control.");
        }
    }, [label, ariaLabel, ariaLabelledBy]);
    useEffect(() => () => {
        if (typeaheadTimer.current)
            clearTimeout(typeaheadTimer.current);
    }, []);
    useEffect(() => {
        if (!open)
            return;
        const onDocumentMouseDown = (event) => {
            var _a, _b;
            const target = event.target;
            if (!((_a = listRef.current) === null || _a === void 0 ? void 0 : _a.contains(target)) && !((_b = buttonRef.current) === null || _b === void 0 ? void 0 : _b.contains(target))) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", onDocumentMouseDown);
        return () => document.removeEventListener("mousedown", onDocumentMouseDown);
    }, [open]);
    useEffect(() => {
        if (!open || !listRef.current)
            return;
        const list = listRef.current;
        const element = list.querySelector(`[data-index="${activeIndex}"]`);
        if (!element)
            return;
        const elementTop = element.offsetTop;
        const elementBottom = elementTop + element.offsetHeight;
        const listScrollTop = list.scrollTop;
        const listVisibleBottom = listScrollTop + list.clientHeight;
        if (elementTop < listScrollTop) {
            list.scrollTop = elementTop;
        }
        else if (elementBottom > listVisibleBottom) {
            list.scrollTop = elementBottom - list.clientHeight;
        }
    }, [open, activeIndex]);
    const openList = () => {
        const start = firstEnabledIndex(selectedIndex === -1 ? 0 : selectedIndex, 1);
        setActiveIndex(start === -1 ? 0 : start);
        setOpen(true);
    };
    const commit = (index) => {
        const option = options[index];
        setOpen(false);
        if (!option || option.disabled)
            return;
        onChange(option.value);
    };
    const moveActive = (delta) => {
        setActiveIndex((prev) => {
            const next = firstEnabledIndex(((prev + delta) % options.length + options.length) % options.length, delta);
            return next === -1 ? prev : next;
        });
    };
    const jumpTo = (edge) => {
        const next = edge === "first" ? firstEnabledIndex(0, 1) : firstEnabledIndex(options.length - 1, -1);
        if (next !== -1)
            setActiveIndex(next);
    };
    const handleTypeahead = (key) => {
        if (typeaheadTimer.current)
            clearTimeout(typeaheadTimer.current);
        typeaheadRef.current += key.toLowerCase();
        typeaheadTimer.current = setTimeout(() => {
            typeaheadRef.current = "";
        }, TYPEAHEAD_RESET_MS);
        const query = typeaheadRef.current;
        const match = options.findIndex((option) => !option.disabled && option.label.toLowerCase().startsWith(query));
        if (match === -1)
            return;
        setActiveIndex(match);
        if (!open)
            onChange(options[match].value);
    };
    const handleKeyDown = (event) => {
        if (disabled)
            return;
        if (!open) {
            switch (event.key) {
                case "ArrowDown":
                case "ArrowUp":
                case "Enter":
                case " ":
                    event.preventDefault();
                    openList();
                    return;
                case "PageUp":
                case "PageDown":
                    event.preventDefault();
                    return;
                default:
                    if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
                        event.preventDefault();
                        handleTypeahead(event.key);
                    }
                    return;
            }
        }
        switch (event.key) {
            case "ArrowDown":
                event.preventDefault();
                moveActive(1);
                break;
            case "ArrowUp":
                event.preventDefault();
                moveActive(-1);
                break;
            case "PageUp":
                event.preventDefault();
                jumpTo("first");
                break;
            case "PageDown":
                event.preventDefault();
                jumpTo("last");
                break;
            case "Home":
                event.preventDefault();
                jumpTo("first");
                break;
            case "End":
                event.preventDefault();
                jumpTo("last");
                break;
            case "Enter":
            case " ":
                event.preventDefault();
                commit(activeIndex);
                break;
            case "Escape":
                event.preventDefault();
                setOpen(false);
                break;
            case "Tab":
                setOpen(false);
                break;
            default:
                if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
                    event.preventDefault();
                    handleTypeahead(event.key);
                }
        }
    };
    const handleListMouseDown = (event) => {
        event.preventDefault();
    };
    return (_jsxs(VStack, { spacing: "sm", className: "w-full", children: [label ? (_jsx("span", { id: labelId, className: "text-sm font-medium text-foreground", children: label })) : null, _jsxs("div", { className: "relative", children: [_jsxs("button", { ref: buttonRef, id: buttonId, type: "button", role: "combobox", disabled: disabled, "aria-haspopup": "listbox", "aria-expanded": open, "aria-controls": open ? listId : undefined, "aria-activedescendant": open && activeIndex >= 0 ? `${baseId}-option-${activeIndex}` : undefined, "aria-label": ariaLabel, "aria-labelledby": ariaLabelledBy !== null && ariaLabelledBy !== void 0 ? ariaLabelledBy : (label ? `${labelId} ${buttonId}` : undefined), onClick: () => (open ? setOpen(false) : openList()), onKeyDown: handleKeyDown, onBlur: () => setOpen(false), className: cn("touch-target-44 focus-ring flex h-10 w-full items-center justify-between rounded-lg border border-border bg-background px-3 text-sm text-foreground", "transition-colors hover:border-muted-foreground/60 active:border-muted-foreground active:bg-elevation-2 dark:active:bg-elevation-3 disabled:cursor-not-allowed disabled:opacity-60"), children: [_jsx("span", { className: cn(!selectedOption && "text-muted-foreground"), children: (_a = selectedOption === null || selectedOption === void 0 ? void 0 : selectedOption.label) !== null && _a !== void 0 ? _a : placeholder }), _jsx(ChevronDown, { className: cn("size-4 text-muted-foreground transition-transform", open && "rotate-180") })] }), open ? (_jsx("ul", { ref: listRef, id: listId, role: "listbox", "aria-label": ariaLabel, "aria-labelledby": ariaLabelledBy !== null && ariaLabelledBy !== void 0 ? ariaLabelledBy : (label ? labelId : undefined), onMouseDown: handleListMouseDown, className: "absolute z-40 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-border bg-surface p-1 shadow-lg animate-fade-in", children: options.map((option, index) => (_jsxs(HStack, { as: "li", id: `${baseId}-option-${index}`, "data-index": index, role: "option", justify: "between", spacing: "none", "aria-selected": option.value === value, "aria-disabled": option.disabled, onMouseEnter: () => setActiveIndex(index), onClick: () => commit(index), className: cn("cursor-pointer rounded-md px-3 py-2 text-sm transition-colors", option.value === value && "bg-primary-500/10 font-semibold text-primary-950 dark:bg-primary-400/15 dark:text-primary-100", index === activeIndex && !option.disabled && "bg-primary-500/15 text-primary-950 dark:bg-primary-400/25 dark:text-primary-50", option.value !== value && index !== activeIndex && "text-foreground hover:bg-elevation-2 active:bg-elevation-3 dark:hover:bg-elevation-3 dark:active:bg-elevation-4", option.disabled && "cursor-not-allowed opacity-60 hover:bg-transparent dark:hover:bg-transparent"), children: [_jsx("span", { children: option.label }), option.value === value ? (_jsx(Check, { className: "size-4 shrink-0 text-primary-600 dark:text-primary-400" })) : null] }, option.value))) })) : null] })] }));
}
