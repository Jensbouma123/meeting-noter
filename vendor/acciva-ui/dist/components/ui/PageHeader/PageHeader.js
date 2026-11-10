import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef } from "react";
import { FRAME_MAX_WIDTH } from "../../../lib/layout-tokens.js";
import { cn } from "../../../lib/utils.js";
import { Heading } from "../Heading/index.js";
export const PageHeader = forwardRef(function PageHeader({ title, description, eyebrow, actions, maxWidth = "3xl", className, ...props }, ref) {
    return (_jsxs("header", { ref: ref, className: cn("flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between", className), ...props, children: [_jsxs("div", { className: cn("flex min-w-0 flex-col gap-1", FRAME_MAX_WIDTH[maxWidth]), children: [eyebrow && (_jsx("p", { className: "text-xs font-semibold uppercase tracking-wide text-primary", children: eyebrow })), _jsx(Heading, { level: 1, size: "3xl", children: title }), description && _jsx("p", { className: "text-base text-muted-foreground", children: description })] }), actions && _jsx("div", { className: "flex flex-wrap items-center gap-2", children: actions })] }));
});
