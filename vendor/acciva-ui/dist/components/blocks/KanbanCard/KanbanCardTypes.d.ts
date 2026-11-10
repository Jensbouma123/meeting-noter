import type { HTMLAttributes } from "react";
export type KanbanStatus = "queued" | "todo" | "inProgress" | "needsDecision" | "done";
export type KanbanCategory = "epic" | "story" | "feature" | "bug" | "chore" | "spike" | "docs";
export interface KanbanCardProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
    ticketKey: string;
    title: string;
    status: KanbanStatus;
    category?: KanbanCategory;
    /** First 3 are shown, then `+N`. */
    labels?: string[];
    blockedBy?: string[];
    /** Pre-formatted ("3/5"). */
    counter?: string;
    branch?: string;
    hasDescription?: boolean;
    /** Omitted renders a non-interactive card; present renders a real button. */
    onOpen?: () => void;
    /** The status-dependent action, a sibling button — the keyboard alternative to drag (SC 2.5.7). */
    primaryAction?: {
        label: string;
        onAction: () => void;
    };
}
