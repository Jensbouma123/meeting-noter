import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { FileText, GitBranch } from "lucide-react";
import { Badge } from "../../ui/Badge/index.js";
import { HStack } from "../../ui/HStack.js";
import { StatusRail } from "../../ui/StatusRail.js";
import { Text } from "../../ui/Text.js";
import { cn } from "../../../lib/utils.js";
import { CATEGORY, MAX_LABELS, STATUS } from "./KanbanCardMeta.js";
export function KanbanCardBody({ ticketKey, title, status, category, labels, blockedBy, counter, branch, hasDescription, keyId, titleId, }) {
    const { name: statusName, Icon: StatusIcon, tone, iconClass } = STATUS[status];
    const categoryMeta = category ? CATEGORY[category] : undefined;
    const needsDecision = status === "needsDecision";
    const blocked = blockedBy.length > 0;
    const shownLabels = labels.slice(0, MAX_LABELS);
    const hiddenLabels = labels.length - shownLabels.length;
    return (_jsxs(_Fragment, { children: [needsDecision && _jsx(StatusRail, { tone: tone }), _jsxs(HStack, { as: "span", wrap: true, spacing: "sm", children: [_jsx(Text, { as: "span", id: keyId, size: "xs", font: "mono", variant: "muted", children: ticketKey }), categoryMeta && (_jsxs(Badge, { variant: "neutral", size: "xxs", children: [_jsx(categoryMeta.Icon, { "aria-hidden": "true" }), categoryMeta.text] })), _jsxs(HStack, { as: "span", spacing: "xs", align: "center", className: "ms-auto", children: [_jsx(StatusIcon, { "aria-hidden": "true", className: cn("size-4 shrink-0", iconClass) }), _jsx(Text, { as: "span", size: "xs", variant: "muted", children: statusName })] })] }), _jsx(Text, { as: "span", id: titleId, size: "sm", weight: "medium", variant: status === "done" ? "muted" : "default", truncate: 2, className: "mt-2 block", children: title }), shownLabels.length > 0 && (_jsxs(HStack, { as: "span", wrap: true, spacing: "xs", className: "mt-2", children: [shownLabels.map((label) => (_jsx(Badge, { variant: "neutral", size: "xxs", children: label }, label))), hiddenLabels > 0 && (_jsxs(Text, { as: "span", size: "xxs", variant: "muted", children: ["+", hiddenLabels] }))] })), blocked && (_jsxs(Text, { as: "span", size: "xs", variant: "danger", className: "mt-2 block", children: ["Blocked by ", blockedBy.join(", ")] })), (counter || hasDescription || branch) && (_jsxs(HStack, { as: "span", spacing: "sm", align: "center", className: "mt-2 text-muted-foreground", children: [counter && (_jsx(Text, { as: "span", size: "xxs", variant: "muted", className: "shrink-0", children: counter })), hasDescription && (_jsxs("span", { className: "inline-flex shrink-0", children: [_jsx(FileText, { "aria-hidden": "true", className: "size-3.5" }), _jsx("span", { className: "sr-only", children: "Has description" })] })), branch && (_jsxs(HStack, { as: "span", spacing: "xs", align: "center", className: "min-w-0", children: [_jsx(GitBranch, { "aria-hidden": "true", className: "size-3.5 shrink-0" }), _jsx(Text, { as: "span", size: "xxs", font: "mono", variant: "muted", truncate: true, children: branch })] }))] }))] }));
}
