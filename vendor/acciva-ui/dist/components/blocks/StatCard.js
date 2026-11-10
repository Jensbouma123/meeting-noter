import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Grid } from "../../components/ui/Grid.js";
import { HStack } from "../../components/ui/HStack.js";
import { VStack } from "../../components/ui/VStack.js";
import { ICON_SIZE_CLASS } from "../../lib/sizing-tokens.js";
import { SURFACE_FILL, SURFACE_RADIUS, SURFACE_SHADOW } from "../../lib/surface-tokens.js";
import { cn } from "../../lib/utils.js";
// Tone colours only the icon chip — never the value or the delta, so a tone can never be
// mistaken for a trend signal (SC 1.4.1). Each pairing is a `-100` fill under `-700` text,
// a ramp that is mode-independent by design and so needs no dark-mode override.
const TONE_ICON_CHIP = {
    primary: "bg-primary-100 text-primary-700",
    secondary: "bg-secondary-100 text-secondary-700",
    accent: "bg-accent-100 text-accent-700",
    success: "bg-success-100 text-success-700",
};
export function StatCard({ label, value, icon: Icon, tone = "primary", delta, deltaLabel, footnote, }) {
    const trendingUp = (delta !== null && delta !== void 0 ? delta : 0) >= 0;
    return (_jsxs(VStack, { spacing: "md", className: cn("p-4 sm:p-6", SURFACE_RADIUS.surface, SURFACE_FILL.surface, SURFACE_SHADOW.surface), children: [_jsxs(HStack, { spacing: "none", justify: "between", children: [_jsx("span", { className: "text-sm font-medium text-muted-foreground", children: label }), _jsx("span", { className: cn("flex size-9 items-center justify-center rounded-lg", TONE_ICON_CHIP[tone]), children: _jsx(Icon, { className: ICON_SIZE_CLASS.lg }) })] }), _jsxs(VStack, { spacing: "xs", children: [_jsxs(HStack, { spacing: "sm", align: "trailing", justify: "between", children: [_jsx("span", { className: "text-2xl font-semibold text-foreground sm:text-3xl", children: value }), delta !== undefined ? (_jsxs("span", { className: cn("mb-1 flex items-center gap-1 text-xs font-medium", trendingUp ? "text-success" : "text-danger"), children: [trendingUp ? _jsx(TrendingUp, { className: "size-3.5" }) : _jsx(TrendingDown, { className: "size-3.5" }), Math.abs(delta), "%", deltaLabel ? ` ${deltaLabel}` : ""] })) : null] }), footnote !== undefined ? _jsx("span", { className: "text-xs text-muted-foreground", children: footnote }) : null] })] }));
}
export function StatCardGrid({ children }) {
    return (_jsx(Grid, { columns: { base: 1, sm: 2, xl: 4 }, spacing: "lg", children: children }));
}
