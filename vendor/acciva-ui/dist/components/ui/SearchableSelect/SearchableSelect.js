"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useDeferredValue, useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "../../../lib/utils.js";
import { VStack } from "../VStack.js";
import { DEFAULT_MAX_LIST_HEIGHT, DEFAULT_OPTION_HEIGHT, defaultFilter } from "./defaults.js";
import { SearchableSelectPanel } from "./SearchableSelectPanel.js";
import { SearchableSelectTrigger } from "./SearchableSelectParts.js";
import { useActiveIndex } from "./useActiveIndex.js";
import { useDismissOnPointerDown } from "./useDismissOnPointerDown.js";
import { useSearchableKeyDown } from "./useSearchableKeyDown.js";
export function SearchableSelect({ id, options, value, onChange, label, placeholder = "Search options…", emptyMessage = "No options match", disabled = false, clearable = false, optionHeight = DEFAULT_OPTION_HEIGHT, maxListHeight = DEFAULT_MAX_LIST_HEIGHT, filter = defaultFilter, className, }) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const deferredQuery = useDeferredValue(query);
    const containerRef = useRef(null);
    const inputRef = useRef(null);
    const listHandle = useRef(null);
    const baseId = useId();
    const inputId = id ?? `${baseId}-input`;
    const listboxId = `${baseId}-listbox`;
    const labelId = `${baseId}-label`;
    const statusId = `${baseId}-status`;
    const optionId = useCallback((index) => `${baseId}-option-${index}`, [baseId]);
    const selectedOption = useMemo(() => options.find((option) => option.value === value) ?? null, [options, value]);
    const normalizedQuery = deferredQuery.trim().toLowerCase();
    const filteredOptions = useMemo(() => {
        if (!normalizedQuery)
            return options;
        return options.filter((option) => filter(option, normalizedQuery));
    }, [options, normalizedQuery, filter]);
    const [activeIndex, setActiveIndex, moveActive] = useActiveIndex(open, filteredOptions, value);
    useDismissOnPointerDown(open, containerRef, setOpen);
    useEffect(() => {
        if (open)
            listHandle.current?.scrollToIndex(activeIndex);
    }, [open, activeIndex]);
    const close = useCallback(() => {
        setOpen(false);
        setQuery("");
    }, []);
    const commit = useCallback((index) => {
        const option = filteredOptions[index];
        if (!option || option.disabled)
            return;
        onChange(option.value);
        close();
        inputRef.current?.focus({ preventScroll: true });
    }, [filteredOptions, onChange, close]);
    const handleKeyDown = useSearchableKeyDown(disabled, open, setOpen, filteredOptions, activeIndex, setActiveIndex, moveActive, commit, close);
    return (_jsxs(VStack, { spacing: "sm", className: cn("w-full", className), children: [label ? (_jsx("label", { id: labelId, htmlFor: inputId, className: "text-sm font-medium text-foreground", children: label })) : null, _jsxs("div", { ref: containerRef, className: "relative", children: [_jsx(SearchableSelectTrigger, { inputId: inputId, inputRef: inputRef, labelId: label ? labelId : undefined, listboxId: listboxId, statusId: statusId, activeId: open && filteredOptions.length > 0 ? optionId(activeIndex) : undefined, disabled: disabled, open: open, query: query, placeholder: placeholder, selected: selectedOption, clearable: clearable, onInputChange: (next) => {
                            setQuery(next);
                            if (!open)
                                setOpen(true);
                        }, onFocus: () => setOpen(true), onKeyDown: handleKeyDown, onToggle: () => {
                            setOpen((previous) => !previous);
                            inputRef.current?.focus({ preventScroll: true });
                        }, onClear: () => {
                            onChange("");
                            setQuery("");
                            inputRef.current?.focus({ preventScroll: true });
                        } }), _jsx("span", { id: statusId, role: "status", "aria-live": "polite", className: "sr-only", children: open ? `${filteredOptions.length} options available` : "" }), open ? (_jsx(SearchableSelectPanel, { items: filteredOptions, value: value, query: normalizedQuery, activeIndex: activeIndex, optionHeight: optionHeight, maxListHeight: maxListHeight, listRef: listHandle, labelId: label ? labelId : undefined, optionId: optionId, emptyMessage: emptyMessage, onCommit: commit, onHover: setActiveIndex })) : null] })] }));
}
