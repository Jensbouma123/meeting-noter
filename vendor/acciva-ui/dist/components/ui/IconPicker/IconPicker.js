"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useId, useMemo, useRef, useState } from "react";
import { Grid } from "../Grid/index.js";
import { Input } from "../Input/index.js";
import { SearchableSelect } from "../SearchableSelect/index.js";
import { VStack } from "../VStack.js";
import { ALL_ICON_NAMES } from "../../../lib/icon-registry.js";
import { cn } from "../../../lib/utils.js";
import { getIconOptions } from "./iconOptions.js";
import { IconCategoryChips, IconOptionButton, SelectedIconPreview } from "./IconPickerParts.js";
import { useIconGridKeyDown } from "./useIconGridKeyDown.js";
import { useIconInputKeyDown } from "./useIconInputKeyDown.js";
import { useIconPickerDismiss } from "./useIconPickerDismiss.js";
export function IconPicker({ value, onChange, variant = "grid", label = "Icon", className }) {
    if (variant === "dropdown") {
        return (_jsx(SearchableSelect, { label: label, options: getIconOptions(), value: value || null, onChange: onChange, placeholder: "Search icons\u2026", emptyMessage: "No icons match", className: className }));
    }
    return _jsx(IconPickerGrid, { value: value, onChange: onChange, className: className });
}
function IconPickerGrid({ value, onChange, className }) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [category, setCategory] = useState("All");
    const [activeIndex, setActiveIndex] = useState(() => Math.max(0, ALL_ICON_NAMES.findIndex((entry) => entry.name === value)));
    const containerRef = useRef(null);
    const inputRef = useRef(null);
    const gridRef = useRef(null);
    const suppressOpenOnFocusRef = useRef(false);
    const listId = useId();
    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return ALL_ICON_NAMES.filter((entry) => {
            const matchesCategory = category === "All" || entry.category === category;
            const matchesQuery = !q || entry.name.toLowerCase().includes(q);
            return matchesCategory && matchesQuery;
        });
    }, [query, category]);
    const rovingIndex = Math.min(Math.max(activeIndex, 0), Math.max(filtered.length - 1, 0));
    useIconPickerDismiss(containerRef, open, setOpen);
    const closeAndFocusTrigger = () => {
        setOpen(false);
        setQuery("");
        suppressOpenOnFocusRef.current = true;
        inputRef.current?.focus({ preventScroll: true });
    };
    const commit = (iconName) => {
        onChange(iconName);
        closeAndFocusTrigger();
    };
    const handleInputKeyDown = useIconInputKeyDown(open, setOpen, gridRef, rovingIndex);
    const handleGridKeyDown = useIconGridKeyDown(gridRef, filtered, setActiveIndex, commit, closeAndFocusTrigger);
    return (_jsxs(VStack, { ref: containerRef, spacing: "none", className: cn("relative w-full", className), children: [_jsx(Input, { ref: inputRef, role: "combobox", "aria-controls": open ? listId : undefined, "aria-expanded": open, "aria-haspopup": "listbox", "aria-label": "Search icons", placeholder: "Search icons\u2026", value: query, onFocus: () => {
                    if (suppressOpenOnFocusRef.current) {
                        suppressOpenOnFocusRef.current = false;
                        return;
                    }
                    setOpen(true);
                }, onClick: () => setOpen(true), onChange: (event) => {
                    setQuery(event.target.value);
                    setActiveIndex(0);
                    if (!open)
                        setOpen(true);
                }, onKeyDown: handleInputKeyDown, leadingIcon: _jsx(SelectedIconPreview, { name: value }), size: "sm" }), open && (_jsxs(VStack, { spacing: "md", inset: "md", className: "absolute top-full z-50 mt-1.5 w-full rounded-xl border border-border bg-surface shadow-lg", children: [_jsx(IconCategoryChips, { category: category, onSelect: (option) => {
                            setCategory(option);
                            setActiveIndex(0);
                        } }), _jsxs(Grid, { ref: gridRef, id: listId, role: "listbox", "aria-label": "Icon picker", onKeyDown: handleGridKeyDown, columns: { base: 6, sm: 8 }, spacing: "xs", inset: "sm", className: "max-h-64 overflow-y-auto rounded-lg border border-border bg-background", children: [filtered.map((entry, index) => (_jsx(IconOptionButton, { name: entry.name, selected: value === entry.name, tabIndex: index === rovingIndex ? 0 : -1, onFocus: () => setActiveIndex(index), onClick: () => {
                                    setActiveIndex(index);
                                    commit(entry.name);
                                } }, entry.name))), filtered.length === 0 ? (_jsxs("p", { className: "col-span-full py-6 text-center text-sm text-muted-foreground", children: ["No icons match \u201C", query, "\u201D."] })) : null] })] }))] }));
}
