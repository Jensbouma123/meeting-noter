import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Check } from "lucide-react";
import { Badge } from "../../components/ui/Badge.js";
import { Button } from "../../components/ui/Button.js";
import { Card } from "../../components/ui/Card.js";
import { HStack } from "../../components/ui/HStack.js";
import { Heading } from "../../components/ui/Heading.js";
import { Text } from "../../components/ui/Text.js";
import { VStack } from "../../components/ui/VStack.js";
import { cn } from "../../lib/utils.js";
export function PricingCard({ name, price, period, description, features, ctaLabel, ctaHref, onSelect, highlighted = false, badge, className, }) {
    return (_jsx(Card, { variant: highlighted ? "elevated" : "default", padding: "lg", className: cn("h-full", highlighted && "border-primary-500 ring-1 ring-primary-500", className), children: _jsxs(VStack, { spacing: "lg", className: "h-full", children: [_jsxs(VStack, { spacing: "xs", children: [_jsxs(HStack, { spacing: "sm", justify: "between", children: [_jsx(Heading, { level: 3, size: "lg", children: name }), highlighted && badge ? _jsx(Badge, { variant: "primary", children: badge }) : null] }), description ? (_jsx(Text, { size: "sm", variant: "muted", children: description })) : null] }), _jsxs(HStack, { spacing: "xs", align: "baseline", children: [_jsx(Heading, { level: 4, size: "display", as: "div", children: price }), period ? (_jsx(Text, { as: "span", size: "sm", variant: "muted", children: period })) : null] }), _jsx(VStack, { as: "ul", spacing: "sm", className: "flex-1", "aria-label": `${name} features`, children: features.map((feature) => (_jsxs(HStack, { as: "li", spacing: "sm", align: "baseline", children: [_jsx(Check, { className: "size-4 shrink-0 text-success", "aria-hidden": "true" }), _jsx(Text, { as: "span", size: "sm", children: feature })] }, feature))) }), _jsx(Button, { variant: highlighted ? "primary" : "outline", size: "lg", href: ctaHref, onClick: onSelect, className: "w-full", children: ctaLabel })] }) }));
}
