import { Book, BookOpen, Bug, CircleCheck, CircleDashed, CircleDot, CircleQuestionMark, Circle, Layers, Search, Sparkles, Wrench, } from "lucide-react";
export const STATUS = {
    queued: { name: "Queued", Icon: CircleDashed, tone: "neutral", iconClass: "text-muted-foreground" },
    todo: { name: "To Do", Icon: Circle, tone: "neutral", iconClass: "text-muted-foreground" },
    inProgress: { name: "In Progress", Icon: CircleDot, tone: "info", iconClass: "text-info" },
    needsDecision: { name: "Needs Decision", Icon: CircleQuestionMark, tone: "warning", iconClass: "text-warning" },
    done: { name: "Done", Icon: CircleCheck, tone: "success", iconClass: "text-success" },
};
export const CATEGORY = {
    epic: { text: "EPIC", Icon: Layers },
    story: { text: "STORY", Icon: Book },
    feature: { text: "FEAT", Icon: Sparkles },
    bug: { text: "BUG", Icon: Bug },
    chore: { text: "CHORE", Icon: Wrench },
    spike: { text: "SPIKE", Icon: Search },
    docs: { text: "DOCS", Icon: BookOpen },
};
export const MAX_LABELS = 3;
export function kanbanCardSummary({ status, category, labels, blockedBy, counter, }) {
    const categoryMeta = category ? CATEGORY[category] : undefined;
    return [
        STATUS[status].name,
        categoryMeta?.text,
        labels.length > 0 ? `Labels: ${labels.join(", ")}` : undefined,
        blockedBy.length > 0 ? `Blocked by ${blockedBy.join(", ")}` : undefined,
        counter,
    ]
        .filter(Boolean)
        .join(". ");
}
