"use client";
import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { Check, ChevronDown, X } from "lucide-react";
import { useCallback, useDeferredValue, useEffect, useId, useMemo, useRef, useState, } from "react";
import { VirtualList } from "../../components/ui/VirtualList.js";
import { cn } from "../../lib/utils.js";
import { HStack } from "./HStack.js";
import { VStack } from "./VStack.js";
const DEFAULT_OPTION_HEIGHT = 36;
const DEFAULT_MAX_LIST_HEIGHT = 288;
function defaultFilter(option, query) {
    return option.label.toLowerCase().includes(query);
}
function OptionAdornment({ icon }) {
    if (!icon)
        return null;
    return (_jsx("span", { "aria-hidden": "true", className: "flex size-4 shrink-0 items-center justify-center text-muted-foreground", children: icon }));
}
function highlightMatch(label, query) {
    if (!query)
        return label;
    const start = label.toLowerCase().indexOf(query);
    if (start === -1)
        return label;
    const end = start + query.length;
    return (_jsxs(_Fragment, { children: [label.slice(0, start), _jsx("mark", { className: "bg-primary-500/15 text-primary-900 dark:bg-primary-400/25 dark:text-primary-200 rounded-xs px-0.5 font-semibold", children: label.slice(start, end) }), label.slice(end)] }));
}
export function SearchableSelect({ id, options, value, onChange, label, placeholder = "Search options…", emptyMessage = "No options match", disabled = false, clearable = false, optionHeight = DEFAULT_OPTION_HEIGHT, maxListHeight = DEFAULT_MAX_LIST_HEIGHT, filter = defaultFilter, className, }) {
    var _a;
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [activeIndex, setActiveIndex] = useState(0);
    const deferredQuery = useDeferredValue(query);
    const containerRef = useRef(null);
    const inputRef = useRef(null);
    const listHandle = useRef(null);
    const baseId = useId();
    const inputId = id !== null && id !== void 0 ? id : `${baseId}-input`;
    const listboxId = `${baseId}-listbox`;
    const labelId = `${baseId}-label`;
    const statusId = `${baseId}-status`;
    const optionId = useCallback((index) => `${baseId}-option-${index}`, [baseId]);
    const selectedOption = useMemo(() => { var _a; return (_a = options.find((option) => option.value === value)) !== null && _a !== void 0 ? _a : null; }, [options, value]);
    const filteredOptions = useMemo(() => {
        const needle = deferredQuery.trim().toLowerCase();
        if (!needle)
            return options;
        return options.filter((option) => filter(option, needle));
    }, [options, deferredQuery, filter]);
    const normalizedQuery = deferredQuery.trim().toLowerCase();
    const firstEnabledIndex = useCallback((list) => {
        const index = list.findIndex((option) => !option.disabled);
        return index === -1 ? 0 : index;
    }, []);
    const [activeIndexSyncKey, setActiveIndexSyncKey] = useState({ open, filteredOptions, value });
    const openedNow = open && !activeIndexSyncKey.open;
    const filtersChangedWhileOpen = open &&
        activeIndexSyncKey.open &&
        (filteredOptions !== activeIndexSyncKey.filteredOptions || value !== activeIndexSyncKey.value);
    if (activeIndexSyncKey.open !== open ||
        filteredOptions !== activeIndexSyncKey.filteredOptions ||
        value !== activeIndexSyncKey.value) {
        setActiveIndexSyncKey({ open, filteredOptions, value });
        if (openedNow || filtersChangedWhileOpen) {
            const selectedIndex = filteredOptions.findIndex((option) => option.value === value && !option.disabled);
            setActiveIndex(selectedIndex === -1 ? firstEnabledIndex(filteredOptions) : selectedIndex);
        }
    }
    useEffect(() => {
        if (!open)
            return;
        const onPointerDown = (event) => {
            var _a;
            if (!((_a = containerRef.current) === null || _a === void 0 ? void 0 : _a.contains(event.target)))
                setOpen(false);
        };
        document.addEventListener("mousedown", onPointerDown);
        return () => document.removeEventListener("mousedown", onPointerDown);
    }, [open]);
    useEffect(() => {
        var _a;
        if (open)
            (_a = listHandle.current) === null || _a === void 0 ? void 0 : _a.scrollToIndex(activeIndex);
    }, [open, activeIndex]);
    const close = useCallback(() => {
        setOpen(false);
        setQuery("");
    }, []);
    const commit = useCallback((index) => {
        var _a;
        const option = filteredOptions[index];
        if (!option || option.disabled)
            return;
        onChange(option.value);
        close();
        (_a = inputRef.current) === null || _a === void 0 ? void 0 : _a.focus({ preventScroll: true });
    }, [filteredOptions, onChange, close]);
    const moveActive = useCallback((delta) => {
        if (filteredOptions.length === 0)
            return;
        setActiveIndex((current) => {
            let next = current;
            for (let step = 0; step < filteredOptions.length; step++) {
                next = (next + delta + filteredOptions.length) % filteredOptions.length;
                if (!filteredOptions[next].disabled)
                    return next;
            }
            return current;
        });
    }, [filteredOptions]);
    const handleKeyDown = useCallback((event) => {
        if (disabled)
            return;
        switch (event.key) {
            case "ArrowDown":
                event.preventDefault();
                if (!open)
                    setOpen(true);
                else
                    moveActive(1);
                break;
            case "ArrowUp":
                event.preventDefault();
                if (!open)
                    setOpen(true);
                else
                    moveActive(-1);
                break;
            case "Home":
                if (!open)
                    return;
                event.preventDefault();
                setActiveIndex(firstEnabledIndex(filteredOptions));
                break;
            case "End": {
                if (!open)
                    return;
                event.preventDefault();
                for (let index = filteredOptions.length - 1; index >= 0; index--) {
                    if (!filteredOptions[index].disabled) {
                        setActiveIndex(index);
                        break;
                    }
                }
                break;
            }
            case "PageUp":
                if (!open)
                    return;
                event.preventDefault();
                setActiveIndex(firstEnabledIndex(filteredOptions));
                break;
            case "PageDown": {
                if (!open)
                    return;
                event.preventDefault();
                for (let index = filteredOptions.length - 1; index >= 0; index--) {
                    if (!filteredOptions[index].disabled) {
                        setActiveIndex(index);
                        break;
                    }
                }
                break;
            }
            case "Enter":
                if (!open)
                    return;
                event.preventDefault();
                commit(activeIndex);
                break;
            case "Escape":
                if (!open)
                    return;
                event.preventDefault();
                close();
                break;
            case "Tab":
                if (open)
                    close();
                break;
            default:
        }
    }, [disabled, open, moveActive, firstEnabledIndex, filteredOptions, commit, activeIndex, close]);
    const listHeight = Math.min(maxListHeight, Math.max(optionHeight, filteredOptions.length * optionHeight));
    const displayValue = open ? query : ((_a = selectedOption === null || selectedOption === void 0 ? void 0 : selectedOption.label) !== null && _a !== void 0 ? _a : "");
    return (_jsxs(VStack, { spacing: "sm", className: cn("w-full", className), children: [label ? (_jsx("label", { id: labelId, htmlFor: inputId, className: "text-sm font-medium text-foreground", children: label })) : null, _jsxs("div", { ref: containerRef, className: "relative", children: [_jsxs("div", { className: cn("flex h-10 w-full items-center gap-1 rounded-lg border border-border bg-background pl-3 pr-1 transition-colors motion-feedback", "focus-within:border-primary-500 hover:border-muted-foreground/60 active:border-foreground", disabled && "cursor-not-allowed opacity-60"), children: [_jsx(OptionAdornment, { icon: selectedOption === null || selectedOption === void 0 ? void 0 : selectedOption.icon }), _jsx("input", { ref: inputRef, id: inputId, type: "text", role: "combobox", autoComplete: "off", spellCheck: false, disabled: disabled, value: displayValue, placeholder: selectedOption ? selectedOption.label : placeholder, "aria-expanded": open, "aria-controls": listboxId, "aria-autocomplete": "list", "aria-labelledby": label ? labelId : undefined, "aria-describedby": statusId, "aria-activedescendant": open && filteredOptions.length > 0 ? optionId(activeIndex) : undefined, onChange: (event) => {
                                    setQuery(event.target.value);
                                    if (!open)
                                        setOpen(true);
                                }, onFocus: () => setOpen(true), onKeyDown: handleKeyDown, className: "focus-ring h-full min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground" }), clearable && selectedOption && !disabled ? (_jsx("button", { type: "button", "aria-label": `Clear ${selectedOption.label}`, onClick: () => {
                                    var _a;
                                    onChange("");
                                    setQuery("");
                                    (_a = inputRef.current) === null || _a === void 0 ? void 0 : _a.focus({ preventScroll: true });
                                }, className: "touch-target-44 focus-ring flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors motion-feedback hover:bg-elevation-2 hover:text-foreground active:bg-elevation-3 active:text-foreground active:scale-[0.99] dark:hover:bg-elevation-3 dark:active:bg-elevation-4", children: _jsx(X, { className: "size-4" }) })) : null, _jsx("button", { type: "button", tabIndex: -1, "aria-hidden": true, disabled: disabled, onClick: () => {
                                    var _a;
                                    setOpen((previous) => !previous);
                                    (_a = inputRef.current) === null || _a === void 0 ? void 0 : _a.focus({ preventScroll: true });
                                }, className: "touch-target-44 flex size-7 items-center justify-center rounded-md text-muted-foreground", children: _jsx(ChevronDown, { className: cn("size-4 transition-transform motion-feedback", open && "rotate-180") }) })] }), _jsx("span", { id: statusId, role: "status", "aria-live": "polite", className: "sr-only", children: open ? `${filteredOptions.length} options available` : "" }), open ? (_jsx("div", { className: "absolute z-40 mt-1 w-full overflow-hidden rounded-lg border border-border bg-surface p-1 shadow-lg animate-fade-in", children: _jsx(VirtualList, { items: filteredOptions, itemHeight: optionHeight, height: listHeight, listRef: listHandle, role: "listbox", itemRole: "option", interactive: false, labelledBy: label ? labelId : undefined, getItemKey: (option) => option.value, getItemId: optionId, isItemDisabled: (option) => Boolean(option.disabled), isItemSelected: (option) => option.value === value, onItemSelect: (_, index) => commit(index), className: "focus:outline-none", emptyState: _jsx("p", { className: "flex h-full items-center justify-center px-3 text-sm text-muted-foreground", children: emptyMessage }), renderItem: (option, state) => (_jsxs(HStack, { justify: "between", spacing: "sm", className: cn("h-full rounded-md px-3 text-sm transition-colors motion-feedback", option.value === value && "bg-primary-500/10 font-semibold text-primary-950 dark:bg-primary-400/15 dark:text-primary-100 active:bg-primary-500/20", state.index === activeIndex && !option.disabled && "bg-primary-500/15 text-primary-950 dark:bg-primary-400/25 dark:text-primary-50 active:bg-primary-500/25", option.value !== value && state.index !== activeIndex && "text-foreground hover:bg-elevation-2 active:bg-elevation-3 dark:hover:bg-elevation-3 dark:active:bg-elevation-4", state.disabled ? "cursor-not-allowed opacity-60 hover:bg-transparent dark:hover:bg-transparent" : "cursor-pointer"), onMouseEnter: () => {
                                    if (!state.disabled)
                                        setActiveIndex(state.index);
                                }, children: [_jsxs(HStack, { as: "span", spacing: "sm", className: "min-w-0", children: [_jsx(OptionAdornment, { icon: option.icon }), _jsx("span", { className: "truncate", children: highlightMatch(option.label, normalizedQuery) })] }), state.selected ? _jsx(Check, { className: "size-4 shrink-0 text-primary-600 dark:text-primary-400" }) : null] })) }) })) : null] })] }));
}
