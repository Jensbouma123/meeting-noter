import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Bell } from "lucide-react";
import { Badge } from "../ui/Badge/index.js";
import { Button } from "../ui/Button/index.js";
import { Card } from "../ui/Card/index.js";
import { EmptyState } from "../ui/EmptyState.js";
import { Heading } from "../ui/Heading/index.js";
import { HStack } from "../ui/HStack.js";
import { RowList } from "../ui/RowList/index.js";
import { StatusDot } from "../ui/StatusDot.js";
import { Text } from "../ui/Text.js";
import { VStack } from "../ui/VStack.js";
import { focusNeighbour } from "../../lib/focus-neighbour.js";
import { cn } from "../../lib/utils.js";
// Secondary and accent have no StatusDot tone, so their unread dot reads as brand.
const UNREAD_DOT_TONE = {
    primary: "brand",
    secondary: "brand",
    accent: "brand",
    success: "success",
    warning: "warning",
    danger: "danger",
    info: "info",
    neutral: "neutral",
};
export function NotificationCenter({ notifications, title = "Notifications", emptyTitle = "You're all caught up", emptyDescription = "New notifications will appear here.", markAllLabel = "Mark all read", onMarkAllRead, onDismiss, onSelect, className, }) {
    const unread = notifications.filter((n) => !n.read).length;
    return (_jsx(Card, { padding: "md", className: cn("w-full", className), "aria-label": title, children: _jsxs(VStack, { spacing: "md", children: [_jsxs(HStack, { justify: "between", align: "center", children: [_jsxs(HStack, { spacing: "sm", align: "center", children: [_jsx(Heading, { level: 2, size: "lg", children: title }), unread > 0 ? (_jsx(Badge, { variant: "primary", "aria-label": `${unread} unread notifications`, children: unread })) : null] }), onMarkAllRead && unread > 0 ? (_jsx(Button, { variant: "ghost", size: "sm", onClick: onMarkAllRead, children: markAllLabel })) : null] }), notifications.length === 0 ? (_jsx(EmptyState, { icon: _jsx(Bell, { className: "size-7", "aria-hidden": "true" }), title: emptyTitle, description: emptyDescription, size: "sm" })) : (_jsx(RowList, { "aria-label": title, divided: true, className: "w-full", children: notifications.map((item) => (_jsx(RowList.Item, { leading: _jsx(StatusDot, { tone: item.read ? "neutral" : UNREAD_DOT_TONE[item.tone ?? "primary"], label: item.read ? "Read" : "Unread" }), title: onSelect ? (_jsx("button", { type: "button", onClick: () => onSelect(item.id), className: "focus-ring min-h-11 rounded text-left sm:min-h-0", "aria-label": `${item.title}${item.read ? "" : ", unread"}`, children: item.title })) : (item.title), meta: item.body || onDismiss ? (_jsxs(_Fragment, { children: [item.body, onDismiss ? (_jsx(Button, { variant: "ghost", size: "sm", "data-dismiss": "", onClick: (event) => {
                                        focusNeighbour(event.currentTarget, "[data-dismiss]");
                                        onDismiss(item.id);
                                    }, "aria-label": `Dismiss notification: ${item.title}`, children: "Dismiss" })) : null] })) : undefined, trailing: _jsx(Text, { as: "span", size: "xs", variant: "muted", children: item.time }) }, item.id))) }))] }) }));
}
