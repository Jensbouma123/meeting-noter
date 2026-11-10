import type { KanbanCardProps } from "./KanbanCardTypes.js";
export interface KanbanCardBodyProps {
    ticketKey: string;
    title: string;
    status: KanbanCardProps["status"];
    category?: KanbanCardProps["category"];
    labels: string[];
    blockedBy: string[];
    counter?: string;
    branch?: string;
    hasDescription: boolean;
    keyId: string;
    titleId: string;
}
export declare function KanbanCardBody({ ticketKey, title, status, category, labels, blockedBy, counter, branch, hasDescription, keyId, titleId, }: KanbanCardBodyProps): import("react").JSX.Element;
