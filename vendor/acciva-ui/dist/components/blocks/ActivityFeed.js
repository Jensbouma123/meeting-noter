import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { Activity } from "lucide-react";
import { Avatar } from "../ui/Avatar.js";
import { Badge } from "../ui/Badge/index.js";
import { Card } from "../ui/Card/index.js";
import { EmptyState } from "../ui/EmptyState.js";
import { Heading } from "../ui/Heading/index.js";
import { RowList } from "../ui/RowList/index.js";
import { VStack } from "../ui/VStack.js";
import { cn } from "../../lib/utils.js";
export function ActivityFeed({ events, title = "Activity", emptyTitle = "No activity yet", emptyDescription = "Recent actions will appear here.", className, }) {
    return (_jsx(Card, { padding: "md", className: cn("w-full", className), "aria-label": title, children: _jsxs(VStack, { spacing: "md", children: [_jsx(Heading, { level: 2, size: "lg", children: title }), events.length === 0 ? (_jsx(EmptyState, { icon: _jsx(Activity, { className: "size-7", "aria-hidden": "true" }), title: emptyTitle, description: emptyDescription, size: "sm" })) : (_jsx(RowList, { "aria-label": title, divided: true, className: "w-full", children: events.map((event) => (_jsx(RowList.Item, { leading: _jsx(Avatar, { src: event.actorSrc, name: event.actor, size: "sm", "aria-hidden": "true" }), title: _jsxs(_Fragment, { children: [_jsx("span", { className: "font-medium", children: event.actor }), " ", _jsx("span", { className: "text-muted-foreground", children: event.action })] }), meta: event.time, trailing: event.tag ? _jsx(Badge, { variant: event.tone ?? "neutral", children: event.tag }) : undefined }, event.id))) }))] }) }));
}
