"use client";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { useState } from "react";
import { Button } from "../../components/ui/Button.js";
import { cn } from "../../lib/utils.js";
import { HStack } from "./HStack.js";
export function Pagination(_a) {
    var _b;
    var { page, totalPages, onPageChange, pageSize, totalItems, pageSizeOptions = [10, 25, 50, 100], onPageSizeChange, showPageSizePicker = false, showPageJump = false, siblingCount = 1, ariaLabel, "aria-label": ariaLabelAttr, className } = _a, props = __rest(_a, ["page", "totalPages", "onPageChange", "pageSize", "totalItems", "pageSizeOptions", "onPageSizeChange", "showPageSizePicker", "showPageJump", "siblingCount", "ariaLabel", "aria-label", "className"]);
    const accessibleName = (_b = ariaLabelAttr !== null && ariaLabelAttr !== void 0 ? ariaLabelAttr : ariaLabel) !== null && _b !== void 0 ? _b : "Pagination navigation";
    const [jumpInput, setJumpInput] = useState("");
    const safeCurrentPage = Math.min(Math.max(1, page), Math.max(1, totalPages));
    const getPageNumbers = () => {
        if (totalPages <= 7) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }
        const pages = [];
        const left = Math.max(2, safeCurrentPage - siblingCount);
        const right = Math.min(totalPages - 1, safeCurrentPage + siblingCount);
        pages.push(1);
        if (left > 2) {
            pages.push("ellipsis");
        }
        for (let i = left; i <= right; i++) {
            pages.push(i);
        }
        if (right < totalPages - 1) {
            pages.push("ellipsis");
        }
        pages.push(totalPages);
        return pages;
    };
    const handleJumpSubmit = (e) => {
        e.preventDefault();
        const target = Number.parseInt(jumpInput, 10);
        if (!Number.isNaN(target)) {
            onPageChange(Math.max(1, Math.min(totalPages, target)));
            setJumpInput("");
        }
    };
    const pageNumbers = getPageNumbers();
    return (_jsxs(HStack, Object.assign({ as: "nav", role: "navigation", "aria-label": accessibleName, wrap: true, justify: "between", spacing: "lg", className: cn("py-2", className) }, props, { children: [totalItems !== undefined && pageSize !== undefined ? (_jsxs("div", { className: "text-xs text-muted-foreground", children: ["Showing", " ", _jsx("span", { className: "font-medium text-foreground", children: Math.min(totalItems, (safeCurrentPage - 1) * pageSize + 1) }), " ", "to", " ", _jsx("span", { className: "font-medium text-foreground", children: Math.min(totalItems, safeCurrentPage * pageSize) }), " ", "of ", _jsx("span", { className: "font-medium text-foreground", children: totalItems.toLocaleString() }), " results"] })) : (_jsxs("div", { className: "text-xs text-muted-foreground", children: ["Page ", _jsx("span", { className: "font-medium text-foreground", children: safeCurrentPage }), " of", " ", _jsx("span", { className: "font-medium text-foreground", children: Math.max(1, totalPages) })] })), _jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [showPageSizePicker && onPageSizeChange && pageSize ? (_jsxs("div", { className: "flex items-center gap-2 mr-2", children: [_jsx("span", { className: "text-xs text-muted-foreground", children: "Rows:" }), _jsx("select", { "aria-label": "Select rows per page", value: pageSize, onChange: (e) => onPageSizeChange(Number(e.target.value)), className: "focus-ring h-8 pointer-coarse:min-h-11 rounded-md border border-border bg-surface px-2 text-xs font-medium text-foreground transition-colors hover:border-muted-foreground/60 active:border-muted-foreground", children: pageSizeOptions.map((opt) => (_jsx("option", { value: opt, children: opt }, opt))) })] })) : null, _jsx(Button, { variant: "outline", size: "xs", iconOnly: true, tooltip: "Go to first page", disabled: safeCurrentPage <= 1, onClick: () => onPageChange(1), children: _jsx(ChevronsLeft, { className: "size-3.5" }) }), _jsx(Button, { variant: "outline", size: "xs", iconOnly: true, tooltip: "Go to previous page", disabled: safeCurrentPage <= 1, onClick: () => onPageChange(safeCurrentPage - 1), children: _jsx(ChevronLeft, { className: "size-3.5" }) }), _jsx(HStack, { spacing: "xs", children: pageNumbers.map((p, idx) => {
                            if (p === "ellipsis") {
                                return (_jsx("span", { "aria-hidden": "true", className: "flex size-7 items-center justify-center text-xs text-muted-foreground", children: "\u2026" }, `ellipsis-${idx}`));
                            }
                            const isCurrent = p === safeCurrentPage;
                            return (_jsx(Button, { size: "xs", variant: isCurrent ? "primary" : "ghost", "aria-current": isCurrent ? "page" : undefined, "aria-label": `Page ${p}`, onClick: () => onPageChange(p), className: "size-7 p-0", children: p }, p));
                        }) }), _jsx(Button, { variant: "outline", size: "xs", iconOnly: true, tooltip: "Go to next page", disabled: safeCurrentPage >= totalPages, onClick: () => onPageChange(safeCurrentPage + 1), children: _jsx(ChevronRight, { className: "size-3.5" }) }), _jsx(Button, { variant: "outline", size: "xs", iconOnly: true, tooltip: "Go to last page", disabled: safeCurrentPage >= totalPages, onClick: () => onPageChange(totalPages), children: _jsx(ChevronsRight, { className: "size-3.5" }) }), showPageJump ? (_jsxs("form", { onSubmit: handleJumpSubmit, className: "ml-2 flex items-center gap-2", children: [_jsx("input", { type: "number", min: 1, max: totalPages, value: jumpInput, onChange: (e) => setJumpInput(e.target.value), placeholder: "Page", "aria-label": "Jump to page number", className: "focus-ring h-8 w-14 pointer-coarse:min-h-11 rounded-md border border-border bg-surface px-2 text-center text-xs font-medium text-foreground transition-colors hover:border-muted-foreground/60 active:border-muted-foreground" }), _jsx(Button, { type: "submit", size: "xs", variant: "outline", children: "Go" })] })) : null] })] })));
}
