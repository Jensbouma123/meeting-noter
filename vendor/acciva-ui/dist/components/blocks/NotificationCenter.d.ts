import type { NotificationCenterProps } from "./NotificationCenter/NotificationCenterTypes.js";
export type { NotificationCenterProps, NotificationItem, NotificationTone } from "./NotificationCenter/NotificationCenterTypes.js";
export declare function NotificationCenter({ notifications, title, emptyTitle, emptyDescription, markAllLabel, onMarkAllRead, onDismiss, onSelect, className, }: NotificationCenterProps): import("react").JSX.Element;
