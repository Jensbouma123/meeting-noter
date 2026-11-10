import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Avatar } from "../../components/ui/Avatar.js";
import { Badge } from "../../components/ui/Badge.js";
import { Card } from "../../components/ui/Card.js";
import { Grid } from "../../components/ui/Grid.js";
import { HStack } from "../../components/ui/HStack.js";
import { Heading } from "../../components/ui/Heading.js";
import { Text } from "../../components/ui/Text.js";
import { VStack } from "../../components/ui/VStack.js";
import { cn } from "../../lib/utils.js";
export function ProfileHeader({ name, subtitle, avatarSrc, bio, badges, stats, actions, className, }) {
    return (_jsx(Card, { padding: "lg", className: cn("w-full", className), children: _jsxs(VStack, { spacing: "lg", children: [_jsxs(HStack, { spacing: "md", align: "center", className: "flex-wrap", children: [_jsx(Avatar, { src: avatarSrc, name: name, size: "lg" }), _jsxs(VStack, { spacing: "xs", className: "min-w-0 flex-1", children: [_jsx(Heading, { level: 1, size: "xl", truncate: true, children: name }), subtitle ? (_jsx(Text, { size: "sm", variant: "muted", truncate: true, children: subtitle })) : null] }), actions ? (_jsx(HStack, { spacing: "sm", className: "w-full flex-wrap sm:w-auto", children: actions })) : null] }), bio ? _jsx(Text, { size: "sm", children: bio }) : null, badges && badges.length > 0 ? (_jsx(HStack, { as: "ul", spacing: "sm", className: "flex-wrap", "aria-label": "Profile tags", children: badges.map((badge) => {
                        var _a;
                        return (_jsx("li", { children: _jsx(Badge, { variant: (_a = badge.variant) !== null && _a !== void 0 ? _a : "neutral", children: badge.label }) }, badge.label));
                    }) })) : null, stats && stats.length > 0 ? (_jsx(Grid, { columns: { base: 2, sm: 4 }, spacing: "md", className: "border-t border-border pt-4", children: stats.map((stat) => (_jsxs(VStack, { as: "dl", spacing: "none", children: [_jsx("dt", { children: _jsx(Text, { as: "span", size: "xs", variant: "muted", children: stat.label }) }), _jsx("dd", { children: _jsx(Text, { as: "span", weight: "semibold", size: "lg", children: stat.value }) })] }, stat.label))) })) : null] }) }));
}
