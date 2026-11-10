import type { BadgeTone } from "../../ui/Badge/index.js";
export type NotificationTone = BadgeTone;
export interface NotificationItem {
    id: string;
    title: string;
    body?: string;
    time: string;
    read?: boolean;
    tone?: NotificationTone;
}
export interface NotificationCenterProps {
    notifications: readonly NotificationItem[];
    title?: string;
    emptyTitle?: string;
    emptyDescription?: string;
    markAllLabel?: string;
    onMarkAllRead?: () => void;
    onDismiss?: (id: string) => void;
    onSelect?: (id: string) => void;
    className?: string;
}
