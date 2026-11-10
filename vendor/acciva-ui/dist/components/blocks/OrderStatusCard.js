import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { Check } from "lucide-react";
import { Badge } from "../../components/ui/Badge.js";
import { Button } from "../../components/ui/Button.js";
import { Card } from "../../components/ui/Card.js";
import { HStack } from "../../components/ui/HStack.js";
import { Heading } from "../../components/ui/Heading.js";
import { Text } from "../../components/ui/Text.js";
import { VStack } from "../../components/ui/VStack.js";
import { cn } from "../../lib/utils.js";
/** Ordered fulfilment steps; `cancelled` sits outside the timeline. */
const STEPS = [
    { status: "placed", label: "Order placed" },
    { status: "packed", label: "Packed" },
    { status: "shipped", label: "Shipped" },
    { status: "delivered", label: "Delivered" },
];
const STATUS_TONE = {
    placed: "neutral",
    packed: "primary",
    shipped: "primary",
    delivered: "success",
    cancelled: "danger",
};
const STATUS_LABEL = {
    placed: "Placed",
    packed: "Packed",
    shipped: "Shipped",
    delivered: "Delivered",
    cancelled: "Cancelled",
};
export function OrderStatusCard({ orderId, status, summary, eta, actions, trackHref, className, }) {
    const reached = STEPS.findIndex((step) => step.status === status);
    const showTrack = trackHref && status !== "delivered" && status !== "cancelled";
    return (_jsx(Card, { padding: "lg", className: cn("w-full max-w-md", className), children: _jsxs(VStack, { spacing: "lg", children: [_jsxs(HStack, { spacing: "sm", justify: "between", children: [_jsxs(VStack, { spacing: "xs", className: "min-w-0", children: [_jsxs(Heading, { level: 3, size: "lg", children: ["Order ", orderId] }), summary ? (_jsx(Text, { size: "sm", variant: "muted", children: summary })) : null] }), _jsx(Badge, { variant: STATUS_TONE[status], dot: true, children: STATUS_LABEL[status] })] }), status !== "cancelled" ? (_jsx(VStack, { as: "ol", spacing: "sm", "aria-label": "Order progress", children: STEPS.map((step, index) => {
                        const done = index <= reached;
                        return (_jsxs(HStack, { as: "li", spacing: "sm", "aria-current": index === reached ? "step" : undefined, children: [_jsx("span", { "aria-hidden": "true", className: cn("flex size-5 shrink-0 items-center justify-center rounded-full border", done
                                        ? "border-success bg-success text-success-foreground"
                                        : "border-border text-transparent"), children: _jsx(Check, { className: "size-3" }) }), _jsxs(Text, { as: "span", size: "sm", variant: done ? "default" : "muted", children: [step.label, done ? _jsx("span", { className: "sr-only", children: " (complete)" }) : null] })] }, step.status));
                    }) })) : null, eta ? (_jsx(Text, { size: "sm", weight: "medium", children: eta })) : null, actions || showTrack ? (_jsxs(HStack, { spacing: "sm", className: "flex-wrap", children: [showTrack ? (_jsx(Button, { href: trackHref, variant: "outline", children: "Track order" })) : null, actions] })) : null] }) }));
}
