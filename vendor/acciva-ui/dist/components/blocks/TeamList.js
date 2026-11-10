import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Users } from "lucide-react";
import { Avatar } from "../ui/Avatar.js";
import { Badge } from "../ui/Badge/index.js";
import { Button } from "../ui/Button/index.js";
import { Card } from "../ui/Card/index.js";
import { EmptyState } from "../ui/EmptyState.js";
import { Heading } from "../ui/Heading/index.js";
import { HStack } from "../ui/HStack.js";
import { RowList } from "../ui/RowList/index.js";
import { VStack } from "../ui/VStack.js";
import { focusNeighbour } from "../../lib/focus-neighbour.js";
import { cn } from "../../lib/utils.js";
export function TeamList({ members, title = "Team", emptyTitle = "No team members yet", emptyDescription = "Invite people to get started.", inviteLabel = "Invite member", onInvite, onRemove, removeLabel = (name) => `Remove ${name} from team`, className, }) {
    return (_jsx(Card, { padding: "md", className: cn("w-full", className), "aria-label": title, children: _jsxs(VStack, { spacing: "md", children: [_jsxs(HStack, { justify: "between", align: "center", children: [_jsxs(HStack, { spacing: "sm", align: "center", children: [_jsx(Heading, { level: 2, size: "lg", children: title }), _jsx(Badge, { variant: "neutral", "aria-label": `${members.length} team members`, children: members.length })] }), onInvite ? (_jsx(Button, { variant: "outline", size: "sm", onClick: onInvite, children: inviteLabel })) : null] }), members.length === 0 ? (_jsx(EmptyState, { icon: _jsx(Users, { className: "size-7", "aria-hidden": "true" }), title: emptyTitle, description: emptyDescription, size: "sm", action: onInvite ? (_jsx(Button, { variant: "primary", size: "sm", onClick: onInvite, children: inviteLabel })) : undefined })) : (_jsx(RowList, { "aria-label": title, divided: true, className: "w-full", children: members.map((member) => (_jsx(RowList.Item, { leading: _jsx(Avatar, { src: member.src, name: member.name, size: "md" }), title: member.name, meta: member.email ? `${member.role} · ${member.email}` : member.role, trailing: onRemove ? (_jsx(Button, { variant: "ghost", size: "sm", "data-remove": "", onClick: (event) => {
                                focusNeighbour(event.currentTarget, "[data-remove]");
                                onRemove(member.id);
                            }, "aria-label": removeLabel(member.name), children: "Remove" })) : undefined }, member.id))) }))] }) }));
}
