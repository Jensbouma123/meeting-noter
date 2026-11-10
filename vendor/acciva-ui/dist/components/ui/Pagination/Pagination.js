"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "../Button/index.js";
import { cn } from "../../../lib/utils.js";
import { HStack } from "../HStack.js";
import { getPageNumbers } from "./pageNumbers.js";
import { PaginationJumpForm, PaginationPageList, PaginationSizePicker, PaginationSummary } from "./PaginationParts.js";
import { usePageJump } from "./usePageJump.js";
export function Pagination({ page, totalPages, onPageChange, pageSize, totalItems, pageSizeOptions = [10, 25, 50, 100], onPageSizeChange, showPageSizePicker = false, showPageJump = false, siblingCount = 1, ariaLabel, "aria-label": ariaLabelAttr, className, ...props }) {
    const accessibleName = ariaLabelAttr ?? ariaLabel ?? "Pagination navigation";
    const [jumpInput, setJumpInput, handleJumpSubmit] = usePageJump(totalPages, onPageChange);
    const safeCurrentPage = Math.min(Math.max(1, page), Math.max(1, totalPages));
    const pageNumbers = getPageNumbers(totalPages, safeCurrentPage, siblingCount);
    return (_jsxs(HStack, { as: "nav", role: "navigation", "aria-label": accessibleName, wrap: true, justify: "between", spacing: "lg", className: cn("py-2", className), ...props, children: [_jsx(PaginationSummary, { page: safeCurrentPage, totalPages: totalPages, pageSize: pageSize, totalItems: totalItems }), _jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [showPageSizePicker && onPageSizeChange && pageSize ? (_jsx(PaginationSizePicker, { pageSize: pageSize, options: pageSizeOptions, onChange: onPageSizeChange })) : null, _jsx(Button, { variant: "outline", size: "xs", iconOnly: true, tooltip: "Go to first page", "aria-disabled": safeCurrentPage <= 1 || undefined, onClick: () => !(safeCurrentPage <= 1) && onPageChange(1), children: _jsx(ChevronsLeft, { className: "size-3.5" }) }), _jsx(Button, { variant: "outline", size: "xs", iconOnly: true, tooltip: "Go to previous page", "aria-disabled": safeCurrentPage <= 1 || undefined, onClick: () => !(safeCurrentPage <= 1) && onPageChange(safeCurrentPage - 1), children: _jsx(ChevronLeft, { className: "size-3.5" }) }), _jsx(PaginationPageList, { pages: pageNumbers, current: safeCurrentPage, onPageChange: onPageChange }), _jsx(Button, { variant: "outline", size: "xs", iconOnly: true, tooltip: "Go to next page", "aria-disabled": safeCurrentPage >= totalPages || undefined, onClick: () => !(safeCurrentPage >= totalPages) && onPageChange(safeCurrentPage + 1), children: _jsx(ChevronRight, { className: "size-3.5" }) }), _jsx(Button, { variant: "outline", size: "xs", iconOnly: true, tooltip: "Go to last page", "aria-disabled": safeCurrentPage >= totalPages || undefined, onClick: () => !(safeCurrentPage >= totalPages) && onPageChange(totalPages), children: _jsx(ChevronsRight, { className: "size-3.5" }) }), showPageJump ? (_jsx(PaginationJumpForm, { value: jumpInput, max: totalPages, onValueChange: setJumpInput, onSubmit: handleJumpSubmit })) : null] })] }));
}
