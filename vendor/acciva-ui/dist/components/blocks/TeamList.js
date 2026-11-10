import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Users } from "lucide-react";
import { Avatar } from "../../components/ui/Avatar.js";
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
export function TeamList({ members, title = "Team", emptyTitle = "No team members yet", emptyDescription = "Invite people to get started.", inviteLabel = "Invite member", onInvite, onRemove, removeLabel = (name) => `Remove ${name} from team`, className, }) {
    return (_jsx(Card, { padding: "md", className: cn("w-full", className), "aria-label": title, children: _jsxs(VStack, { spacing: "md", children: [_jsxs(HStack, { justify: "between", align: "center", children: [_jsxs(HStack, { spacing: "sm", align: "center", children: [_jsx(Heading, { level: 2, size: "lg", children: title }), _jsx(Badge, { variant: "neutral", "aria-label": `${members.length} team members`, children: members.length })] }), onInvite ? (_jsx(Button, { variant: "outline", size: "sm", onClick: onInvite, children: inviteLabel })) : null] }), members.length === 0 ? (_jsx(EmptyState, { icon: _jsx(Users, { className: "size-7", "aria-hidden": "true" }), title: emptyTitle, description: emptyDescription, size: "sm", action: onInvite ? (_jsx(Button, { variant: "primary", size: "sm", onClick: onInvite, children: inviteLabel })) : undefined })) : (_jsx("ul", { className: "flex w-full flex-col", "aria-label": title, children: members.map((member, index) => (_jsxs("li", { children: [index > 0 ? _jsx(Divider, {}) : null, _jsxs(HStack, { spacing: "sm", align: "center", className: "w-full py-3", children: [_jsx(Avatar, { src: member.src, name: member.name, size: "md" }), _jsxs(VStack, { spacing: "xs", className: "min-w-0 flex-1", children: [_jsx(Text, { size: "sm", weight: "medium", truncate: true, children: member.name }), _jsxs(HStack, { spacing: "sm", align: "center", className: "min-w-0", children: [_jsx(Text, { size: "xs", variant: "muted", truncate: true, children: member.role }), member.email ? (_jsx(Text, { size: "xs", variant: "subtle", truncate: true, children: member.email })) : null] })] }), onRemove ? (_jsx(Button, { variant: "ghost", size: "sm", onClick: () => onRemove(member.id), "aria-label": removeLabel(member.name), children: "Remove" })) : null] })] }, member.id))) }))] }) }));
}
