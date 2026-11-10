import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Avatar } from "../ui/Avatar.js";
import { Badge } from "../ui/Badge/index.js";
import { Card } from "../ui/Card/index.js";
import { Grid } from "../ui/Grid/index.js";
import { HStack } from "../ui/HStack.js";
import { Heading } from "../ui/Heading/index.js";
import { Text } from "../ui/Text.js";
import { VStack } from "../ui/VStack.js";
import { cn } from "../../lib/utils.js";
export function ProfileHeader({ name, subtitle, avatarSrc, bio, badges, stats, actions, className, }) {
    return (_jsx(Card, { padding: "lg", className: cn("w-full", className), children: _jsxs(VStack, { spacing: "lg", children: [_jsxs(HStack, { spacing: "md", align: "center", className: "flex-wrap", children: [_jsx(Avatar, { src: avatarSrc, name: name, size: "lg" }), _jsxs(VStack, { spacing: "xs", className: "min-w-0 flex-1", children: [_jsx(Heading, { level: 1, size: "xl", truncate: true, children: name }), subtitle ? (_jsx(Text, { size: "sm", variant: "muted", truncate: true, children: subtitle })) : null] }), actions ? (_jsx(HStack, { spacing: "sm", className: "w-full flex-wrap sm:w-auto", children: actions })) : null] }), bio ? _jsx(Text, { size: "sm", children: bio }) : null, badges && badges.length > 0 ? (_jsx(HStack, { as: "ul", spacing: "sm", className: "flex-wrap", "aria-label": "Profile tags", children: badges.map((badge) => (_jsx("li", { children: _jsx(Badge, { variant: badge.variant ?? "neutral", children: badge.label }) }, badge.label))) })) : null, stats && stats.length > 0 ? (_jsx(Grid, { columns: { base: 2, sm: 4 }, spacing: "md", className: "border-t border-border pt-4", children: stats.map((stat) => (_jsxs(VStack, { as: "dl", spacing: "none", children: [_jsx("dt", { children: _jsx(Text, { as: "span", size: "xs", variant: "muted", children: stat.label }) }), _jsx("dd", { children: _jsx(Text, { as: "span", weight: "semibold", size: "lg", children: stat.value }) })] }, stat.label))) })) : null] }) }));
}
