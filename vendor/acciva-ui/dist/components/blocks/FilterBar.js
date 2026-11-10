"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Search, SlidersHorizontal } from "lucide-react";
import { useId, useState } from "react";
import { Badge } from "../ui/Badge/index.js";
import { Button } from "../ui/Button/index.js";
import { Card } from "../ui/Card/index.js";
import { HStack } from "../ui/HStack.js";
import { Input } from "../ui/Input/index.js";
import { Select } from "../ui/Select/index.js";
import { Stack } from "../ui/Stack/index.js";
import { VStack } from "../ui/VStack.js";
export function FilterBar({ searchValue, onSearchChange, sortOptions, sortValue, onSortChange, activeFilters = [], onRemoveFilter, onOpenFilters, }) {
    const [expanded, setExpanded] = useState(false);
    const mobileFilterId = useId();
    return (_jsx(Card, { padding: "sm", children: _jsxs(VStack, { spacing: "md", children: [_jsxs(Stack, { direction: { base: "vertical", sm: "horizontal" }, spacing: "sm", children: [_jsx("div", { className: "flex-1", children: _jsx(Input, { placeholder: "Search\u2026", value: searchValue, onChange: (event) => onSearchChange(event.target.value), leadingIcon: _jsx(Search, {}) }) }), _jsxs(HStack, { spacing: "sm", children: [_jsxs(Button, { variant: "outline", size: "md", className: "sm:hidden", onClick: () => setExpanded((prev) => !prev), "aria-expanded": expanded, "aria-controls": mobileFilterId, children: [_jsx(SlidersHorizontal, { className: "size-4" }), "Filters"] }), _jsx("div", { className: "hidden w-48 sm:block", children: _jsx(Select, { options: sortOptions, value: sortValue, onChange: onSortChange, placeholder: "Sort by", "aria-label": "Sort by" }) }), onOpenFilters ? (_jsxs(Button, { variant: "outline", size: "md", className: "hidden sm:inline-flex", onClick: onOpenFilters, children: [_jsx(SlidersHorizontal, { className: "size-4" }), "More filters"] })) : null] })] }), expanded ? (_jsx("div", { id: mobileFilterId, className: "sm:hidden", children: _jsx(Select, { options: sortOptions, value: sortValue, onChange: onSortChange, placeholder: "Sort by", "aria-label": "Sort by" }) })) : null, activeFilters.length > 0 ? (_jsx(HStack, { spacing: "sm", wrap: true, children: activeFilters.map((filter) => onRemoveFilter ? (_jsx(Badge, { variant: "chip", selected: true, onDismiss: () => onRemoveFilter(filter), dismissLabel: `Remove ${filter} filter`, children: filter }, filter)) : (_jsx(Badge, { variant: "chip", selected: true, children: filter }, filter))) })) : null] }) }));
}
