import { type LucideIcon } from "lucide-react";
import type { StatusRailTone } from "../../ui/StatusRail.js";
import type { KanbanCategory, KanbanStatus } from "./KanbanCardTypes.js";
export declare const STATUS: Record<KanbanStatus, {
    name: string;
    Icon: LucideIcon;
    tone: StatusRailTone;
    iconClass: string;
}>;
export declare const CATEGORY: Record<KanbanCategory, {
    text: string;
    Icon: LucideIcon;
}>;
export declare const MAX_LABELS = 3;
export declare function kanbanCardSummary({ status, category, labels, blockedBy, counter, }: {
    status: KanbanStatus;
    category?: KanbanCategory;
    labels: string[];
    blockedBy: string[];
    counter?: string;
}): string;
