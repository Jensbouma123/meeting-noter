"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useDeferredValue, useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "../../../lib/utils.js";
import { anchorNameFor } from "../_combobox/parts.js";
import { useActiveIndex } from "../_combobox/useActiveIndex.js";
import { useComboboxKeyDown } from "../_combobox/useComboboxKeyDown.js";
import { useDismissOnPointerDown } from "../_combobox/useDismissOnPointerDown.js";
import { Input } from "../Input/index.js";
import { DEFAULT_MAX_LIST_HEIGHT, DEFAULT_OPTION_HEIGHT, defaultFilter } from "./defaults.js";
import { SearchComboboxPanel } from "./SearchComboboxPanel.js";
const navigate = (href) => window.location.assign(href);
/** Search-and-go combobox: type to filter, Enter/click follows a link option or runs an action. No committed value. */
export function SearchCombobox({ id, options, label, "aria-label": ariaLabel, placeholder = "Search…", emptyMessage = "No results", disabled = false, onNavigate = navigate, optionHeight = DEFAULT_OPTION_HEIGHT, maxListHeight = DEFAULT_MAX_LIST_HEIGHT, filter = defaultFilter, className, }) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const deferredQuery = useDeferredValue(query);
    const containerRef = useRef(null);
    const inputRef = useRef(null);
    const listHandle = useRef(null);
    const baseId = useId();
    const inputId = id ?? `${baseId}-input`;
    const listboxId = `${baseId}-listbox`;
    const statusId = `${baseId}-status`;
    const optionId = useCallback((index) => `${baseId}-option-${index}`, [baseId]);
    const normalizedQuery = deferredQuery.trim().toLowerCase();
    const results = useMemo(() => (normalizedQuery ? options.filter((option) => filter(option, normalizedQuery)) : options), [options, normalizedQuery, filter]);
    const [activeIndex, setActiveIndex, moveActive] = useActiveIndex(open, results, null);
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
        const option = results[index];
        if (!option || option.disabled)
            return;
        close();
        if (option.href)
            onNavigate(option.href);
        else {
            option.onSelect?.();
            inputRef.current?.focus({ preventScroll: true });
        }
    }, [results, close, onNavigate]);
    const handleKeyDown = useComboboxKeyDown(disabled, open, setOpen, results, activeIndex, setActiveIndex, moveActive, commit, close);
    return (_jsxs("div", { ref: containerRef, style: { anchorName: anchorNameFor(listboxId) }, className: cn("relative w-full", className), children: [_jsx(Input, { ref: inputRef, id: inputId, type: "search", role: "combobox", label: label, "aria-label": label ? undefined : ariaLabel, placeholder: placeholder, disabled: disabled, spellCheck: false, autoComplete: "off", value: query, "aria-expanded": open, "aria-controls": listboxId, "aria-autocomplete": "list", "aria-activedescendant": open && results.length > 0 ? optionId(activeIndex) : undefined, "aria-describedby": statusId, onChange: (event) => {
                    setQuery(event.target.value);
                    if (!open)
                        setOpen(true);
                }, onFocus: () => setOpen(true), onKeyDown: handleKeyDown, onClear: () => setQuery("") }), _jsx("span", { id: statusId, role: "status", "aria-live": "polite", className: "sr-only", children: open ? `${results.length} results available` : "" }), open ? (_jsx(SearchComboboxPanel, { items: results, query: normalizedQuery, activeIndex: activeIndex, optionHeight: optionHeight, maxListHeight: maxListHeight, listRef: listHandle, listboxId: listboxId, listLabel: label ?? ariaLabel, optionId: optionId, emptyMessage: emptyMessage, onCommit: commit, onHover: setActiveIndex })) : null] }));
}
