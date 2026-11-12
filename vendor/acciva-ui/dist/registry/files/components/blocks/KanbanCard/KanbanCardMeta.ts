import {
  Book,
  BookOpen,
  Bug,
  CircleCheck,
  CircleDashed,
  CircleDot,
  CircleQuestionMark,
  Circle,
  Layers,
  Search,
  Sparkles,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { StatusRailTone } from "@/components/ui/StatusRail";
import type { KanbanCategory, KanbanStatus } from "@/components/blocks/KanbanCard/KanbanCardTypes";

export const STATUS: Record<KanbanStatus, { name: string; Icon: LucideIcon; tone: StatusRailTone; iconClass: string }> = {
  queued: { name: "Queued", Icon: CircleDashed, tone: "neutral", iconClass: "text-muted-foreground" },
  todo: { name: "To Do", Icon: Circle, tone: "neutral", iconClass: "text-muted-foreground" },
  inProgress: { name: "In Progress", Icon: CircleDot, tone: "info", iconClass: "text-info" },
  needsDecision: { name: "Needs Decision", Icon: CircleQuestionMark, tone: "warning", iconClass: "text-warning" },
  done: { name: "Done", Icon: CircleCheck, tone: "success", iconClass: "text-success" },
};

export const CATEGORY: Record<KanbanCategory, { text: string; Icon: LucideIcon }> = {
  epic: { text: "EPIC", Icon: Layers },
  story: { text: "STORY", Icon: Book },
  feature: { text: "FEAT", Icon: Sparkles },
  bug: { text: "BUG", Icon: Bug },
  chore: { text: "CHORE", Icon: Wrench },
  spike: { text: "SPIKE", Icon: Search },
  docs: { text: "DOCS", Icon: BookOpen },
};

export const MAX_LABELS = 3;

export function kanbanCardSummary({
  status,
  category,
  labels,
  blockedBy,
  counter,
}: {
  status: KanbanStatus;
  category?: KanbanCategory;
  labels: string[];
  blockedBy: string[];
  counter?: string;
}) {
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
