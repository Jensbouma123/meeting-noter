import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button } from "../Button/index.js";
export function DataListPageJump({ id, currentPage, totalPages, value, onValueChange, onSubmit, }) {
    return (
    // Raw flex: `hidden`/`md:flex` is a display toggle, and `gap-1.5` a half step.
    _jsxs("form", { onSubmit: onSubmit, className: "hidden md:flex items-center gap-1.5 pl-2 border-l border-border", children: [_jsx("label", { htmlFor: id, className: "text-xs text-muted-foreground", children: "Go to:" }), _jsx("input", { id: id, type: "number", min: 1, max: totalPages, value: value, onChange: (e) => onValueChange(e.target.value), placeholder: `${currentPage}`, className: "focus-ring h-8 w-14 pointer-coarse:min-h-11 rounded-md border border-border bg-background px-2 text-center text-xs text-foreground", "aria-label": `Jump to page between 1 and ${totalPages}` }), _jsx(Button, { type: "submit", variant: "secondary", size: "sm", className: "h-8 px-2 text-xs", children: "Go" })] }));
}
