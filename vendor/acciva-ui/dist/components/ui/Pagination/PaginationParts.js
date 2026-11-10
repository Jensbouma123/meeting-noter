import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button } from "../Button/index.js";
import { HStack } from "../HStack.js";
export function PaginationSummary({ page, totalPages, pageSize, totalItems, }) {
    if (totalItems !== undefined && pageSize !== undefined) {
        return (_jsxs("div", { className: "text-xs text-muted-foreground", children: ["Showing", " ", _jsx("span", { className: "font-medium text-foreground", children: Math.min(totalItems, (page - 1) * pageSize + 1) }), " ", "to", " ", _jsx("span", { className: "font-medium text-foreground", children: Math.min(totalItems, page * pageSize) }), " of", " ", _jsx("span", { className: "font-medium text-foreground", children: totalItems.toLocaleString() }), " results"] }));
    }
    return (_jsxs("div", { className: "text-xs text-muted-foreground", children: ["Page ", _jsx("span", { className: "font-medium text-foreground", children: page }), " of", " ", _jsx("span", { className: "font-medium text-foreground", children: Math.max(1, totalPages) })] }));
}
export function PaginationSizePicker({ pageSize, options, onChange, }) {
    return (_jsxs("div", { className: "flex items-center gap-2 mr-2", children: [_jsx("span", { className: "text-xs text-muted-foreground", children: "Rows:" }), _jsx("select", { "aria-label": "Select rows per page", value: pageSize, onChange: (e) => onChange(Number(e.target.value)), className: "focus-ring h-8 pointer-coarse:min-h-11 rounded-md border border-border bg-surface px-2 text-xs font-medium text-foreground transition-colors hover:border-muted-foreground/60 active:border-muted-foreground", children: options.map((opt) => (_jsx("option", { value: opt, children: opt }, opt))) })] }));
}
export function PaginationPageList({ pages, current, onPageChange, }) {
    return (_jsx(HStack, { spacing: "xs", children: pages.map((p, idx) => {
            if (p === "ellipsis") {
                return (_jsx("span", { "aria-hidden": "true", className: "flex size-7 items-center justify-center text-xs text-muted-foreground", children: "\u2026" }, `ellipsis-${idx}`));
            }
            const isCurrent = p === current;
            return (_jsx(Button, { size: "xs", variant: isCurrent ? "primary" : "ghost", "aria-current": isCurrent ? "page" : undefined, "aria-label": `Page ${p}`, onClick: () => onPageChange(p), className: "size-7 p-0", children: p }, p));
        }) }));
}
export function PaginationJumpForm({ value, max, onValueChange, onSubmit, }) {
    return (_jsxs("form", { onSubmit: onSubmit, className: "ml-2 flex items-center gap-2", children: [_jsx("input", { type: "number", min: 1, max: max, value: value, onChange: (e) => onValueChange(e.target.value), placeholder: "Page", "aria-label": "Jump to page number", className: "focus-ring h-8 w-14 pointer-coarse:min-h-11 rounded-md border border-border bg-surface px-2 text-center text-xs font-medium text-foreground transition-colors hover:border-muted-foreground/60 active:border-muted-foreground" }), _jsx(Button, { type: "submit", size: "xs", variant: "outline", children: "Go" })] }));
}
