import { type BadgeTone } from "../ui/Badge/index.js";
export interface ActivityEvent {
    id: string;
    actor: string;
    actorSrc?: string;
    action: string;
    time: string;
    tone?: BadgeTone;
    tag?: string;
}
export interface ActivityFeedProps {
    events: readonly ActivityEvent[];
    title?: string;
    emptyTitle?: string;
    emptyDescription?: string;
    className?: string;
}
export declare function ActivityFeed({ events, title, emptyTitle, emptyDescription, className, }: ActivityFeedProps): import("react").JSX.Element;
