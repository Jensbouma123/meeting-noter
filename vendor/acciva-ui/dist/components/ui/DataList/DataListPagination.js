import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { HStack } from "../HStack.js";
import { DataListPageButtons } from "./DataListPageButtons.js";
import { DataListPageJump } from "./DataListPageJump.js";
import { DEFAULT_PAGE_SIZE_OPTIONS } from "./utils.js";
export function DataListPagination({ props, view }) {
    const { mode = "virtual", showPageSizePicker = true, showPageJump = true, pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS, } = props;
    if (mode !== "paginated" || view.totalItems === 0)
        return null;
    const startItem = (view.currentPage - 1) * view.activePageSize + 1;
    const endItem = Math.min(view.currentPage * view.activePageSize, view.totalItems);
    return (_jsxs(HStack, { as: "nav", role: "navigation", "aria-label": "Pagination", spacing: "lg", wrap: true, justify: "between", className: "border-t border-border/80 pt-4", children: [_jsxs(HStack, { spacing: "md", wrap: true, className: "text-xs text-muted-foreground", children: [_jsxs("span", { children: ["Showing ", _jsx("span", { className: "font-medium text-foreground", children: startItem }), " to", " ", _jsx("span", { className: "font-medium text-foreground", children: endItem }), " of", " ", _jsx("span", { className: "font-medium text-foreground", children: view.totalItems.toLocaleString() }), " items"] }), showPageSizePicker && (
                    // Raw flex: `gap-1.5` is a half step, off the full-step spacing scale.
                    _jsxs("div", { className: "flex items-center gap-1.5 pl-2 border-l border-border", children: [_jsx("label", { htmlFor: `${view.generatedId}-page-size`, className: "sr-only", children: "Items per page" }), _jsx("span", { "aria-hidden": "true", children: "Rows:" }), _jsx("select", { id: `${view.generatedId}-page-size`, value: view.activePageSize, onChange: (e) => view.handlePageSizeChange(Number(e.target.value)), "aria-label": "Items per page", className: "focus-ring h-8 pointer-coarse:min-h-11 rounded-md border border-border bg-background px-2 text-xs text-foreground", children: pageSizeOptions.map((opt) => (_jsx("option", { value: opt, children: opt }, opt))) })] }))] }), _jsxs("div", { className: "flex flex-wrap items-center gap-1.5", children: [_jsx(DataListPageButtons, { currentPage: view.currentPage, totalPages: view.totalPages, onPageChange: view.handlePageChange }), showPageJump && view.totalPages > 3 && (_jsx(DataListPageJump, { id: `${view.generatedId}-page-jump`, currentPage: view.currentPage, totalPages: view.totalPages, value: view.jumpPageInput, onValueChange: view.setJumpPageInput, onSubmit: view.handleJumpSubmit }))] })] }));
}
