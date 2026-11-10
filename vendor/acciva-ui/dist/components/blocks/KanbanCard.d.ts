import type { KanbanCardProps } from "./KanbanCard/KanbanCardTypes.js";
export type { KanbanCardProps, KanbanCategory, KanbanStatus } from "./KanbanCard/KanbanCardTypes.js";
export declare function KanbanCard({ ticketKey, title, status, category, labels, blockedBy, counter, branch, hasDescription, onOpen, primaryAction, className, ...props }: KanbanCardProps): import("react").JSX.Element;
