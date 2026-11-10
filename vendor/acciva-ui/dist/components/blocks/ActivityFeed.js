import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Activity } from "lucide-react";
import { Avatar } from "../../components/ui/Avatar.js";
import { Badge } from "../../components/ui/Badge.js";
import { Card } from "../../components/ui/Card.js";
import { EmptyState } from "../../components/ui/EmptyState.js";
import { Heading } from "../../components/ui/Heading.js";
import { HStack } from "../../components/ui/HStack.js";
import { Text } from "../../components/ui/Text.js";
import { VStack } from "../../components/ui/VStack.js";
import { cn } from "../../lib/utils.js";
export function ActivityFeed({ events, title = "Activity", emptyTitle = "No activity yet", emptyDescription = "Recent actions will appear here.", className, }) {
    return (_jsx(Card, { padding: "md", className: cn("w-full", className), "aria-label": title, children: _jsxs(VStack, { spacing: "md", children: [_jsx(Heading, { level: 2, size: "lg", children: title }), events.length === 0 ? (_jsx(EmptyState, { icon: _jsx(Activity, { className: "size-7", "aria-hidden": "true" }), title: emptyTitle, description: emptyDescription, size: "sm" })) : (_jsx("ol", { className: "flex w-full flex-col", "aria-label": title, children: events.map((event) => {
                        var _a;
                        return (_jsx("li", { children: _jsxs(HStack, { spacing: "sm", align: "leading", className: "w-full py-3", children: [_jsx(Avatar, { src: event.actorSrc, name: event.actor, size: "sm", "aria-hidden": "true" }), _jsxs(VStack, { spacing: "xs", className: "min-w-0 flex-1", children: [_jsxs(Text, { size: "sm", className: "min-w-0", children: [_jsx("span", { className: "font-medium", children: event.actor }), " ", _jsx("span", { className: "text-muted-foreground", children: event.action })] }), _jsxs(HStack, { spacing: "sm", align: "center", children: [_jsx(Text, { size: "xs", variant: "subtle", children: event.time }), event.tag ? _jsx(Badge, { variant: (_a = event.tone) !== null && _a !== void 0 ? _a : "neutral", children: event.tag }) : null] })] })] }) }, event.id));
                    }) }))] }) }));
}
