import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Card } from "../ui/Card/index.js";
import { Grid } from "../ui/Grid/index.js";
import { Heading } from "../ui/Heading/index.js";
import { HStack } from "../ui/HStack.js";
import { Text } from "../ui/Text.js";
import { VStack } from "../ui/VStack.js";
import { ICON_SIZE_CLASS } from "../../lib/sizing-tokens/index.js";
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
    const trendingUp = (delta ?? 0) >= 0;
    return (_jsx(Card, { padding: "md", children: _jsxs(VStack, { spacing: "md", children: [_jsxs(HStack, { spacing: "none", justify: "between", children: [_jsx(Text, { as: "span", size: "sm", weight: "medium", variant: "muted", children: label }), _jsx("span", { className: cn("flex size-9 items-center justify-center rounded-lg", TONE_ICON_CHIP[tone]), children: _jsx(Icon, { className: ICON_SIZE_CLASS.lg }) })] }), _jsxs(VStack, { spacing: "xs", children: [_jsxs(HStack, { spacing: "sm", align: "trailing", justify: "between", children: [_jsx(Heading, { as: "span", size: "2xl", weight: "semibold", children: value }), delta !== undefined ? (_jsxs(HStack, { as: "span", spacing: "xs", align: "center", className: cn("mb-1 text-xs font-medium", trendingUp ? "text-success" : "text-danger"), children: [trendingUp ? _jsx(TrendingUp, { className: "size-3.5" }) : _jsx(TrendingDown, { className: "size-3.5" }), Math.abs(delta), "%", deltaLabel ? ` ${deltaLabel}` : ""] })) : null] }), footnote !== undefined ? (_jsx(Text, { as: "span", size: "xs", variant: "muted", children: footnote })) : null] })] }) }));
}
export function StatCardGrid({ children }) {
    return (_jsx(Grid, { columns: { base: 1, sm: 2, xl: 4 }, spacing: "lg", children: children }));
}
