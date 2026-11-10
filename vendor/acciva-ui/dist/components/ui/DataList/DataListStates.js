import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Loader2 } from "lucide-react";
import { Button } from "../Button/index.js";
import { VStack } from "../VStack.js";
export function DataListLoading() {
    return (_jsxs(VStack, { spacing: "md", align: "center", justify: "center", className: "h-48 w-full text-muted-foreground", children: [_jsx(Loader2, { className: "size-7 animate-spin text-primary-500" }), _jsx("span", { className: "text-sm", children: "Loading items..." })] }));
}
export function DataListEmpty({ message, searchQuery, onClearSearch }) {
    return (_jsxs(VStack, { spacing: "sm", align: "center", justify: "center", inset: "xl", className: "h-48 w-full rounded-xl border border-dashed border-border bg-surface/30 text-center", children: [_jsx("span", { className: "text-sm font-medium text-foreground", children: message }), searchQuery && (_jsx(Button, { variant: "outline", size: "sm", onClick: onClearSearch, className: "mt-2 text-xs", children: "Clear filter" }))] }));
}
