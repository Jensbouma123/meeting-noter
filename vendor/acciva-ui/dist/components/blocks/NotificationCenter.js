import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Bell } from "lucide-react";
import { Badge } from "../../components/ui/Badge.js";
import { Button } from "../../components/ui/Button.js";
import { Card } from "../../components/ui/Card.js";
import { Divider } from "../../components/ui/Divider.js";
import { EmptyState } from "../../components/ui/EmptyState.js";
import { Heading } from "../../components/ui/Heading.js";
import { HStack } from "../../components/ui/HStack.js";
import { Text } from "../../components/ui/Text.js";
import { VStack } from "../../components/ui/VStack.js";
import { cn } from "../../lib/utils.js";
const UNREAD_DOT_TONE = {
    primary: "bg-primary-500",
    secondary: "bg-secondary-500",
    accent: "bg-accent-500",
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-danger",
    info: "bg-info",
    neutral: "bg-muted-foreground",
};
export function NotificationCenter({ notifications, title = "Notifications", emptyTitle = "You're all caught up", emptyDescription = "New notifications will appear here.", markAllLabel = "Mark all read", onMarkAllRead, onDismiss, onSelect, className, }) {
    const unread = notifications.filter((n) => !n.read).length;
    return (_jsx(Card, { padding: "md", className: cn("w-full", className), "aria-label": title, children: _jsxs(VStack, { spacing: "md", children: [_jsxs(HStack, { justify: "between", align: "center", children: [_jsxs(HStack, { spacing: "sm", align: "center", children: [_jsx(Heading, { level: 2, size: "lg", children: title }), unread > 0 ? (_jsx(Badge, { variant: "primary", "aria-label": `${unread} unread notifications`, children: unread })) : null] }), onMarkAllRead && unread > 0 ? (_jsx(Button, { variant: "ghost", size: "sm", onClick: onMarkAllRead, children: markAllLabel })) : null] }), notifications.length === 0 ? (_jsx(EmptyState, { icon: _jsx(Bell, { className: "size-7", "aria-hidden": "true" }), title: emptyTitle, description: emptyDescription, size: "sm" })) : (_jsx("ul", { className: "flex w-full flex-col", "aria-label": title, children: notifications.map((item, index) => {
                        var _a;
                        return (_jsxs("li", { children: [index > 0 ? _jsx(Divider, {}) : null, _jsxs(HStack, { spacing: "sm", align: "leading", className: cn("w-full py-3", !item.read && "font-medium"), children: [_jsx("span", { "aria-hidden": "true", className: cn("mt-1.5 size-2 shrink-0 rounded-full", item.read ? "bg-border" : UNREAD_DOT_TONE[(_a = item.tone) !== null && _a !== void 0 ? _a : "primary"]) }), _jsxs(VStack, { spacing: "xs", className: "min-w-0 flex-1", children: [_jsxs(HStack, { spacing: "sm", justify: "between", align: "leading", children: [_jsx(Text, { size: "sm", weight: "medium", className: "min-w-0 flex-1", children: onSelect ? (_jsx("button", { type: "button", onClick: () => onSelect(item.id), className: "focus-ring min-h-11 rounded text-left sm:min-h-0", "aria-label": `${item.title}${item.read ? "" : ", unread"}`, children: item.title })) : (item.title) }), _jsx(Text, { size: "xs", variant: "muted", className: "shrink-0", children: item.time })] }), item.body ? (_jsx(Text, { size: "sm", variant: "muted", children: item.body })) : null, onDismiss ? (_jsx("span", { children: _jsx(Button, { variant: "ghost", size: "sm", onClick: () => onDismiss(item.id), "aria-label": `Dismiss notification: ${item.title}`, children: "Dismiss" }) })) : null] })] })] }, item.id));
                    }) }))] }) }));
}
