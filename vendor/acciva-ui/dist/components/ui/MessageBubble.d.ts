import { type HTMLAttributes, type ReactNode } from "react";
export type MessageBubbleRole = "user" | "assistant";
export interface MessageBubbleProps extends HTMLAttributes<HTMLDivElement> {
    /** Side and surface: `user` aligns trailing on a brand tint, `assistant` aligns leading on a muted surface. */
    role: MessageBubbleRole;
    /** Names the bubble for screen readers (`aria-label` on the group). Omit and the group stays unnamed. */
    author?: string;
    /** Message content. Strings render as plain text — never parsed as Markdown or HTML. */
    children: ReactNode;
}
export declare const MessageBubble: import("react").ForwardRefExoticComponent<MessageBubbleProps & import("react").RefAttributes<HTMLDivElement>>;
