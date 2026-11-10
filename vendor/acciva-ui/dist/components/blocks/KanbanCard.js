var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Book, BookOpen, Bug, CircleCheck, CircleDashed, CircleDot, CircleQuestionMark, Circle, FileText, GitBranch, Layers, Search, Sparkles, Wrench, } from "lucide-react";
import { useId } from "react";
import { Badge } from "../../components/ui/Badge.js";
import { Button } from "../../components/ui/Button.js";
import { Card } from "../../components/ui/Card.js";
import { StatusRail } from "../../components/ui/StatusRail.js";
import { Text } from "../../components/ui/Text.js";
import { cn } from "../../lib/utils.js";
const STATUS = {
    queued: { name: "Queued", Icon: CircleDashed, tone: "neutral", iconClass: "text-muted-foreground" },
    todo: { name: "To Do", Icon: Circle, tone: "neutral", iconClass: "text-muted-foreground" },
    inProgress: { name: "In Progress", Icon: CircleDot, tone: "info", iconClass: "text-info" },
    needsDecision: { name: "Needs Decision", Icon: CircleQuestionMark, tone: "warning", iconClass: "text-warning" },
    done: { name: "Done", Icon: CircleCheck, tone: "success", iconClass: "text-success" },
};
const CATEGORY = {
    epic: { text: "EPIC", Icon: Layers },
    story: { text: "STORY", Icon: Book },
    feature: { text: "FEAT", Icon: Sparkles },
    bug: { text: "BUG", Icon: Bug },
    chore: { text: "CHORE", Icon: Wrench },
    spike: { text: "SPIKE", Icon: Search },
    docs: { text: "DOCS", Icon: BookOpen },
};
const MAX_LABELS = 3;
export function KanbanCard(_a) {
    var { ticketKey, title, status, category, labels = [], blockedBy = [], counter, branch, hasDescription = false, onOpen, primaryAction, className } = _a, props = __rest(_a, ["ticketKey", "title", "status", "category", "labels", "blockedBy", "counter", "branch", "hasDescription", "onOpen", "primaryAction", "className"]);
    const id = useId();
    const keyId = `${id}-key`;
    const titleId = `${id}-title`;
    const descId = `${id}-desc`;
    const { name: statusName, Icon: StatusIcon, tone, iconClass } = STATUS[status];
    const categoryMeta = category ? CATEGORY[category] : undefined;
    const needsDecision = status === "needsDecision";
    const blocked = blockedBy.length > 0;
    const shownLabels = labels.slice(0, MAX_LABELS);
    const hiddenLabels = labels.length - shownLabels.length;
    const summary = [
        statusName,
        categoryMeta === null || categoryMeta === void 0 ? void 0 : categoryMeta.text,
        labels.length > 0 ? `Labels: ${labels.join(", ")}` : undefined,
        blocked ? `Blocked by ${blockedBy.join(", ")}` : undefined,
        counter,
    ]
        .filter(Boolean)
        .join(". ");
    const body = (_jsxs(_Fragment, { children: [needsDecision && _jsx(StatusRail, { tone: tone }), _jsxs("span", { className: "flex flex-wrap items-center gap-x-2 gap-y-1", children: [_jsx(Text, { as: "span", id: keyId, size: "xs", font: "mono", variant: "muted", children: ticketKey }), categoryMeta && (_jsxs(Badge, { variant: "neutral", size: "xxs", children: [_jsx(categoryMeta.Icon, { "aria-hidden": "true" }), categoryMeta.text] })), _jsxs("span", { className: "ms-auto inline-flex items-center gap-1", children: [_jsx(StatusIcon, { "aria-hidden": "true", className: cn("size-4 shrink-0", iconClass) }), _jsx(Text, { as: "span", size: "xs", variant: "muted", children: statusName })] })] }), _jsx(Text, { as: "span", id: titleId, size: "sm", weight: "medium", variant: status === "done" ? "muted" : "default", truncate: 2, className: "mt-2 block", children: title }), shownLabels.length > 0 && (_jsxs("span", { className: "mt-2 flex flex-wrap items-center gap-1", children: [shownLabels.map((label) => (_jsx(Badge, { variant: "neutral", size: "xxs", children: label }, label))), hiddenLabels > 0 && (_jsxs(Text, { as: "span", size: "xxs", variant: "muted", children: ["+", hiddenLabels] }))] })), blocked && (_jsxs(Text, { as: "span", size: "xs", variant: "danger", className: "mt-2 block", children: ["Blocked by ", blockedBy.join(", ")] })), (counter || hasDescription || branch) && (_jsxs("span", { className: "mt-2 flex items-center gap-2 text-muted-foreground", children: [counter && (_jsx(Text, { as: "span", size: "xxs", variant: "muted", className: "shrink-0", children: counter })), hasDescription && (_jsxs("span", { className: "inline-flex shrink-0", children: [_jsx(FileText, { "aria-hidden": "true", className: "size-3.5" }), _jsx("span", { className: "sr-only", children: "Has description" })] })), branch && (_jsxs("span", { className: "inline-flex min-w-0 items-center gap-1", children: [_jsx(GitBranch, { "aria-hidden": "true", className: "size-3.5 shrink-0" }), _jsx(Text, { as: "span", size: "xxs", font: "mono", variant: "muted", truncate: true, children: branch })] }))] }))] }));
    const cardClass = cn("w-full text-start", needsDecision && "border-warning/20 dark:border-warning/30");
    return (_jsxs("div", Object.assign({ className: cn("flex flex-col gap-2", className) }, props, { children: [onOpen ? (_jsx(Card, { asChild: true, padding: "sm", className: cardClass, children: _jsxs("button", { type: "button", onClick: onOpen, "aria-labelledby": `${keyId} ${titleId}`, "aria-describedby": descId, children: [body, _jsx("span", { id: descId, className: "sr-only", children: summary })] }) })) : (_jsxs(Card, { padding: "sm", role: "group", "aria-labelledby": `${keyId} ${titleId}`, "aria-describedby": descId, className: cardClass, children: [body, _jsx("span", { id: descId, className: "sr-only", children: summary })] })), primaryAction && (_jsx(Button, { variant: "secondary", size: "sm", onClick: primaryAction.onAction, children: primaryAction.label }))] })));
}
