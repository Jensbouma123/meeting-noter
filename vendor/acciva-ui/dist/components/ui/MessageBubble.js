import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef } from "react";
import { SURFACE_RADIUS } from "../../lib/surface-tokens.js";
import { cn } from "../../lib/utils.js";
const ALIGNMENT = {
    user: "justify-end",
    assistant: "justify-start",
};
/** Sender surface: brand tint for the user (mirrors the primary Badge tone), muted surface + hairline border for the assistant. */
const SURFACE = {
    user: "border-primary-500/20 bg-primary-500/10 text-primary-900 dark:border-primary-400/30 dark:bg-primary-400/15 dark:text-primary-300",
    assistant: "border-border bg-surface text-foreground",
};
export const MessageBubble = forwardRef(function MessageBubble({ role, author, className, children, ...rest }, ref) {
    return (_jsx("div", { ref: ref, role: "group", "aria-label": author, className: cn("flex w-full", ALIGNMENT[role]), ...rest, children: _jsx("div", { className: cn("w-fit max-w-md border px-4 py-2.5 text-sm break-words", SURFACE_RADIUS.surface, SURFACE[role], className), children: children }) }));
});
