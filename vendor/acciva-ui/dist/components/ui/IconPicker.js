"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Search } from "lucide-react";
import { createElement, useEffect, useId, useMemo, useRef, useState } from "react";
import { ALL_ICON_NAMES, getIconComponent } from "../../lib/icon-registry.js";
import { cn } from "../../lib/utils.js";
import { Grid } from "./Grid.js";
import { HStack } from "./HStack.js";
import { Input } from "./Input.js";
import { SearchableSelect } from "./SearchableSelect.js";
import { VStack } from "./VStack.js";
const CATEGORY_OPTIONS = [
    "All",
    "Navigation",
    "Interface",
    "Communication",
    "Media",
    "Files",
    "Commerce",
    "Weather & Nature",
    "Travel",
    "Development",
    "Charts & Data",
    "People",
    "Security",
    "Devices",
    "Emotion",
    "Misc",
];
let iconOptionsCache = null;
/** Builds the full registry option list once; the glyph elements are reused across mounts and keystrokes. */
function getIconOptions() {
    iconOptionsCache !== null && iconOptionsCache !== void 0 ? iconOptionsCache : (iconOptionsCache = ALL_ICON_NAMES.map((entry) => {
        const Icon = getIconComponent(entry.name);
        return {
            value: entry.name,
            label: entry.name,
            icon: Icon ? createElement(Icon, { className: "size-4", "aria-hidden": true }) : undefined,
        };
    }));
    return iconOptionsCache;
}
export function IconPicker({ value, onChange, variant = "grid", label = "Icon", className }) {
    if (variant === "dropdown") {
        return (_jsx(SearchableSelect, { label: label, options: getIconOptions(), value: value || null, onChange: onChange, placeholder: "Search icons\u2026", emptyMessage: "No icons match", className: className }));
    }
    return _jsx(IconPickerGrid, { value: value, onChange: onChange, className: className });
}
function SelectedIconPreview({ name }) {
    const Icon = getIconComponent(name);
    if (!Icon)
        return _jsx(Search, { className: "size-4", "aria-hidden": "true" });
    return createElement(Icon, { className: "size-4", "aria-hidden": true });
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
    useEffect(() => {
        if (!open)
            return;
        const onPointerDown = (event) => {
            var _a;
            if (!((_a = containerRef.current) === null || _a === void 0 ? void 0 : _a.contains(event.target))) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", onPointerDown);
        return () => document.removeEventListener("mousedown", onPointerDown);
    }, [open]);
    const closeAndFocusTrigger = () => {
        var _a;
        setOpen(false);
        setQuery("");
        suppressOpenOnFocusRef.current = true;
        (_a = inputRef.current) === null || _a === void 0 ? void 0 : _a.focus({ preventScroll: true });
    };
    const commit = (iconName) => {
        onChange(iconName);
        closeAndFocusTrigger();
    };
    const columnCount = (options) => {
        if (options.length < 2)
            return 1;
        const firstTop = options[0].offsetTop;
        const nextRow = options.findIndex((option) => option.offsetTop > firstTop);
        return nextRow === -1 ? options.length : nextRow;
    };
    const handleInputKeyDown = (event) => {
        var _a;
        if (event.key === "Escape") {
            if (open) {
                event.preventDefault();
                setOpen(false);
            }
            return;
        }
        if (event.key === "ArrowDown") {
            event.preventDefault();
            if (!open) {
                setOpen(true);
            }
            else {
                const grid = gridRef.current;
                if (grid) {
                    const options = Array.from(grid.querySelectorAll('[role="option"]'));
                    const target = (_a = options[rovingIndex]) !== null && _a !== void 0 ? _a : options[0];
                    target === null || target === void 0 ? void 0 : target.focus({ preventScroll: true });
                }
            }
            return;
        }
    };
    const handleGridKeyDown = (event) => {
        if (event.key === "Escape") {
            event.preventDefault();
            closeAndFocusTrigger();
            return;
        }
        const grid = gridRef.current;
        if (!grid)
            return;
        const options = Array.from(grid.querySelectorAll('[role="option"]'));
        if (options.length === 0)
            return;
        const current = options.findIndex((option) => option === document.activeElement);
        if (current === -1)
            return;
        const columns = columnCount(options);
        const last = options.length - 1;
        let next = null;
        switch (event.key) {
            case "ArrowRight":
                next = Math.min(current + 1, last);
                break;
            case "ArrowLeft":
                next = Math.max(current - 1, 0);
                break;
            case "ArrowDown":
                next = Math.min(current + columns, last);
                break;
            case "ArrowUp":
                next = Math.max(current - columns, 0);
                break;
            case "Home":
                next = 0;
                break;
            case "End":
                next = last;
                break;
            case "Enter":
            case " ":
                if (filtered[current]) {
                    event.preventDefault();
                    commit(filtered[current].name);
                }
                return;
            default:
                return;
        }
        event.preventDefault();
        setActiveIndex(next);
        options[next].focus();
    };
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
                }, onKeyDown: handleInputKeyDown, leadingIcon: value ? (_jsx(SelectedIconPreview, { name: value })) : (_jsx(Search, { className: "size-4", "aria-hidden": "true" })), size: "sm" }), open && (_jsxs(VStack, { spacing: "md", inset: "md", className: "absolute top-full z-50 mt-1.5 w-full rounded-xl border border-border bg-surface shadow-lg", children: [_jsx(HStack, { align: "stretch", wrap: true, spacing: "sm", children: CATEGORY_OPTIONS.map((option) => (_jsx("button", { type: "button", "aria-pressed": category === option, onClick: () => {
                                setCategory(option);
                                setActiveIndex(0);
                            }, className: cn("focus-ring rounded-full px-3 py-1 text-xs font-medium transition-colors", category === option
                                ? "bg-primary-600 text-button-primary-foreground font-semibold dark:bg-primary-500"
                                : "bg-elevation-2 text-muted-foreground hover:bg-elevation-3 hover:text-foreground dark:hover:bg-elevation-4"), children: option }, option))) }), _jsxs(Grid, { ref: gridRef, id: listId, role: "listbox", "aria-label": "Icon picker", onKeyDown: handleGridKeyDown, columns: { base: 6, sm: 8 }, spacing: "xs", inset: "sm", className: "max-h-64 overflow-y-auto rounded-lg border border-border bg-background", children: [filtered.map((entry, index) => {
                                const Icon = getIconComponent(entry.name);
                                if (!Icon)
                                    return null;
                                const selected = value === entry.name;
                                return (_jsx("button", { type: "button", role: "option", "aria-selected": selected, "aria-label": entry.name, title: entry.name, tabIndex: index === rovingIndex ? 0 : -1, onFocus: () => setActiveIndex(index), onClick: () => {
                                        setActiveIndex(index);
                                        commit(entry.name);
                                    }, className: cn("focus-ring flex aspect-square items-center justify-center rounded-md transition-colors", selected
                                        ? "bg-primary-600 text-button-primary-foreground shadow-xs dark:bg-primary-500"
                                        : "text-foreground hover:bg-elevation-2 active:bg-elevation-3 dark:hover:bg-elevation-3 dark:active:bg-elevation-4"), children: createElement(Icon, { className: "size-4", "aria-hidden": true }) }, entry.name));
                            }), filtered.length === 0 ? (_jsxs("p", { className: "col-span-full py-6 text-center text-sm text-muted-foreground", children: ["No icons match \u201C", query, "\u201D."] })) : null] })] }))] }));
}
