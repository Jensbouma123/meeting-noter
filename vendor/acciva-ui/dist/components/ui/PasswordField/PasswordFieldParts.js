import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
export function CapsLockNotice() {
    return (_jsxs("div", { role: "status", "aria-live": "polite", className: "flex items-center gap-1.5 text-xs font-medium text-warning animate-fade-in", children: [_jsx(ArrowBigUp, { className: "size-3.5 shrink-0", "aria-hidden": "true" }), _jsx("span", { children: "Caps Lock is on" })] }));
}
export function StrengthMeter({ score, label }) {
    return (_jsxs(VStack, { spacing: "xs", className: "mt-0.5", children: [_jsx("div", { role: "meter", "aria-valuenow": score, "aria-valuemin": 0, "aria-valuemax": 4, "aria-valuetext": `Password strength: ${label}`, "aria-label": "Password strength", className: "flex gap-2 h-1.5 w-full", children: [1, 2, 3, 4].map((step) => (_jsx("div", { className: cn("h-full flex-1 rounded-full transition-colors motion-feedback", step <= score ? STRENGTH_COLORS[score] : "bg-muted-foreground/20") }, step))) }), _jsxs(HStack, { align: "stretch", justify: "between", spacing: "none", className: "text-xs text-muted-foreground", children: [_jsx("span", { children: "Strength" }), _jsx("span", { className: "font-medium text-foreground", children: label })] })] }));
}
