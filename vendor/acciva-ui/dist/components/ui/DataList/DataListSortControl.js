import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Button } from "../Button/index.js";
import { HStack } from "../HStack.js";
export function DataListSortControl({ id, options, activeKey, direction, onSortChange, onToggleDirection, }) {
    return (_jsxs(HStack, { spacing: "xs", children: [_jsx("label", { htmlFor: id, className: "sr-only", children: "Sort by" }), _jsx("select", { id: id, value: activeKey, onChange: (e) => onSortChange(e.target.value, direction), "aria-label": "Sort list by", className: "focus-ring h-9 pointer-coarse:min-h-11 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground", children: options.map((opt) => (_jsxs("option", { value: opt.key, children: ["Sort: ", opt.label] }, opt.key))) }), _jsx(Button, { variant: "outline", size: "sm", iconOnly: true, tooltip: `Sort direction: ${direction === "asc" ? "Ascending" : "Descending"}`, onClick: onToggleDirection, className: "h-9 w-9", children: direction === "asc" ? (_jsx(ArrowUp, { className: "size-3.5 text-primary-800 dark:text-primary-300" })) : (_jsx(ArrowDown, { className: "size-3.5 text-primary-800 dark:text-primary-300" })) })] }));
}
