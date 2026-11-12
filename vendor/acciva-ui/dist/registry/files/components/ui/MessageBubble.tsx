import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { SURFACE_RADIUS } from "@/lib/surface-tokens";
import { cn } from "@/lib/utils";

export type MessageBubbleRole = "user" | "assistant";

export interface MessageBubbleProps extends HTMLAttributes<HTMLDivElement> {
  /** Side and surface: `user` aligns trailing on a brand tint, `assistant` aligns leading on a muted surface. */
  role: MessageBubbleRole;
  /** Names the bubble for screen readers (`aria-label` on the group). Omit and the group stays unnamed. */
  author?: string;
  /** Message content. Strings render as plain text — never parsed as Markdown or HTML. */
  children: ReactNode;
}

const ALIGNMENT: Record<MessageBubbleRole, string> = {
  user: "justify-end",
  assistant: "justify-start",
};

/** Sender surface: brand tint for the user (mirrors the primary Badge tone), muted surface + hairline border for the assistant. */
const SURFACE: Record<MessageBubbleRole, string> = {
  user: "border-primary-500/20 bg-primary-500/10 text-primary-900 dark:border-primary-400/30 dark:bg-primary-400/15 dark:text-primary-300",
  assistant: "border-border bg-surface text-foreground",
};

export const MessageBubble = forwardRef<HTMLDivElement, MessageBubbleProps>(
  function MessageBubble({ role, author, className, children, ...rest }, ref) {
    return (
      <div ref={ref} role="group" aria-label={author} className={cn("flex w-full", ALIGNMENT[role])} {...rest}>
        <div
          className={cn(
            "w-fit max-w-md border px-4 py-2.5 text-sm break-words",
            SURFACE_RADIUS.surface,
            SURFACE[role],
            className,
          )}
        >
          {children}
        </div>
      </div>
    );
  },
);
