import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useId } from "react";
import { Button } from "../ui/Button/index.js";
import { Card } from "../ui/Card/index.js";
import { cn } from "../../lib/utils.js";
import { KanbanCardBody } from "./KanbanCard/KanbanCardParts.js";
import { kanbanCardSummary } from "./KanbanCard/KanbanCardMeta.js";
export function KanbanCard({ ticketKey, title, status, category, labels = [], blockedBy = [], counter, branch, hasDescription = false, onOpen, primaryAction, className, ...props }) {
    const id = useId();
    const keyId = `${id}-key`;
    const titleId = `${id}-title`;
    const descId = `${id}-desc`;
    const needsDecision = status === "needsDecision";
    const summary = kanbanCardSummary({ status, category, labels, blockedBy, counter });
    const body = (_jsx(KanbanCardBody, { ticketKey: ticketKey, title: title, status: status, category: category, labels: labels, blockedBy: blockedBy, counter: counter, branch: branch, hasDescription: hasDescription, keyId: keyId, titleId: titleId }));
    const cardClass = cn("w-full text-start", needsDecision && "border-warning/20 dark:border-warning/30");
    return (_jsxs("div", { className: cn("flex flex-col gap-2", className), ...props, children: [onOpen ? (_jsx(Card, { asChild: true, padding: "sm", className: cardClass, children: _jsxs("button", { type: "button", onClick: onOpen, "aria-labelledby": `${keyId} ${titleId}`, "aria-describedby": descId, children: [body, _jsx("span", { id: descId, className: "sr-only", children: summary })] }) })) : (_jsxs(Card, { padding: "sm", role: "group", "aria-labelledby": `${keyId} ${titleId}`, "aria-describedby": descId, className: cardClass, children: [body, _jsx("span", { id: descId, className: "sr-only", children: summary })] })), primaryAction && (_jsx(Button, { variant: "secondary", size: "sm", onClick: primaryAction.onAction, children: primaryAction.label }))] }));
}
