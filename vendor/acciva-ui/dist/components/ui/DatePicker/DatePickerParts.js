import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { resolveResponsive, TEXT_SIZE } from "../../../lib/sizing-tokens/index.js";
import { cn } from "../../../lib/utils.js";
export function DatePickerLabel({ id, htmlFor, label, required, size }) {
    if (!label)
        return null;
    return (_jsxs("label", { id: id, htmlFor: htmlFor, className: cn("font-medium text-foreground", resolveResponsive(size, TEXT_SIZE)), children: [label, required ? _jsx("span", { className: "ml-0.5 text-danger", children: "*" }) : null] }));
}
export function DatePickerMessages({ hint, hintId, error, errorId }) {
    return (_jsxs(_Fragment, { children: [hint && !error ? (_jsx("p", { id: hintId, className: "text-xs text-muted-foreground", children: hint })) : null, error ? (_jsx("p", { id: errorId, role: "alert", className: "text-xs font-medium text-danger animate-fade-in", children: error })) : null] }));
}
