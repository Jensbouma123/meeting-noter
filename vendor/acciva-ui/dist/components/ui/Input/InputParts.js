import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { CONTROL_HEIGHT, ICON_SCALE_CLASS, INPUT_ICON_INSET, INPUT_PADDING_X, TEXT_SIZE, resolveResponsive, } from "../../../lib/sizing-tokens/index.js";
import { cn } from "../../../lib/utils.js";
import { HStack } from "../HStack.js";
import { ADDON_RADIUS_LEADING, ADDON_RADIUS_TRAILING } from "./constants.js";
export function InputLabel({ id, label, required, size }) {
    return (_jsxs("label", { htmlFor: id, className: cn("font-medium text-foreground", resolveResponsive(size, TEXT_SIZE)), children: [label, required ? _jsx("span", { className: "ml-0.5 text-danger", children: "*" }) : null] }));
}
export function InputAddon({ id, side, size, disabled, children }) {
    const radius = side === "leading" ? ADDON_RADIUS_LEADING : ADDON_RADIUS_TRAILING;
    return (_jsx("span", { id: id, className: cn("inline-flex shrink-0 items-center whitespace-nowrap border border-border bg-elevation-2 text-muted-foreground", resolveResponsive(size, CONTROL_HEIGHT), resolveResponsive(size, INPUT_PADDING_X), resolveResponsive(size, TEXT_SIZE), resolveResponsive(size, ICON_SCALE_CLASS), disabled && "opacity-60", resolveResponsive(size, radius), side === "leading" ? "-mr-px" : "-ml-px"), children: children }));
}
export function InputLeadingIcon({ size, children }) {
    return (_jsx("span", { className: cn("pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted-foreground", resolveResponsive(size, INPUT_ICON_INSET), resolveResponsive(size, ICON_SCALE_CLASS)), children: children }));
}
export function InputMessages({ hint, error, hintId, errorId, charCountId, count, maxLength }) {
    return (_jsxs(HStack, { justify: "between", spacing: "sm", children: [_jsx("div", { className: "min-w-0 flex-1", children: error ? (_jsx("p", { id: errorId, role: "alert", className: "text-xs font-medium text-danger animate-fade-in", children: error })) : hint ? (_jsx("p", { id: hintId, className: "text-xs text-muted-foreground", children: hint })) : null }), charCountId ? (_jsxs("span", { id: charCountId, "aria-live": "polite", className: cn("shrink-0 text-xs font-mono tabular-nums", maxLength !== undefined && count > maxLength ? "font-semibold text-danger" : "text-muted-foreground"), children: [count, maxLength !== undefined ? ` / ${maxLength}` : ""] })) : null] }));
}
