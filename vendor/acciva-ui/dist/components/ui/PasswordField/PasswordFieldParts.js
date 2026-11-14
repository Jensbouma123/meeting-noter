import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { ArrowBigUp } from "lucide-react";
import { cn } from "../../../lib/utils.js";
import { HStack } from "../HStack.js";
import { VStack } from "../VStack.js";
const STRENGTH_COLORS = {
    1: "bg-danger",
    2: "bg-warning",
    3: "bg-info",
    4: "bg-success",
};
/** Always mounted so screen readers catch the text when it appears; collapsed while inactive. */
export function CapsLockNotice({ active }) {
    return (_jsx("div", { role: "status", "aria-live": "polite", className: active ? "flex items-center gap-1.5 text-xs font-medium text-warning animate-fade-in" : "sr-only", children: active ? (_jsxs(_Fragment, { children: [_jsx(ArrowBigUp, { className: "size-3.5 shrink-0", "aria-hidden": "true" }), _jsx("span", { children: "Caps Lock is on" })] })) : null }));
}
export function StrengthMeter({ score, label }) {
    return (_jsxs(VStack, { spacing: "xs", className: "mt-0.5", children: [_jsx("div", { role: "meter", "aria-valuenow": score, "aria-valuemin": 0, "aria-valuemax": 4, "aria-valuetext": `Password strength: ${label}`, "aria-label": "Password strength", className: "flex gap-2 h-1.5 w-full", children: [1, 2, 3, 4].map((step) => (_jsx("div", { className: cn("h-full flex-1 rounded-full transition-colors motion-feedback", step <= score ? STRENGTH_COLORS[score] : "bg-muted-foreground/20") }, step))) }), _jsxs(HStack, { align: "stretch", justify: "between", spacing: "none", className: "text-xs text-muted-foreground", children: [_jsx("span", { children: "Strength" }), _jsx("span", { className: "font-medium text-foreground", children: label })] })] }));
}
