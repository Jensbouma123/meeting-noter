import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { Button } from "../Button/index.js";
import { HStack } from "../HStack.js";
export function DataListSelectionBar({ selectedCount, itemCount, onSelectAll, onClear }) {
    return (_jsxs(HStack, { spacing: "sm", className: "rounded-lg bg-surface px-3 py-1.5 border border-border text-xs", children: [_jsx("span", { className: "font-medium text-foreground", children: selectedCount > 0 ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "text-primary-800 dark:text-primary-300 font-semibold", children: selectedCount }), " of", " ", itemCount, " selected"] })) : ("0 selected") }), _jsx("div", { className: "h-4 w-px bg-border" }), _jsx(Button, { variant: "ghost", size: "sm", className: "h-7 px-2 text-xs", onClick: onSelectAll, disabled: itemCount === 0 || selectedCount === itemCount, children: "Select all" }), selectedCount > 0 && (_jsx(Button, { variant: "ghost", size: "sm", className: "h-7 px-2 text-xs text-muted-foreground hover:text-foreground", onClick: onClear, children: "Clear" }))] }));
}
