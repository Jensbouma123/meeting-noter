import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from "./utils.js";
/**
 * Visual caption for `useArrowHint`. Absolute, so it never shifts layout; the
 * parent must be `relative`. aria-hidden: the same text reaches assistive tech
 * through aria-describedby on the group while visible.
 */
export function ArrowHint({ id, text, visible, className }) {
    if (!visible || !text)
        return null;
    return (_jsx("span", { id: id, "aria-hidden": "true", className: cn("pointer-events-none absolute left-0 top-full z-10 mt-1 rounded-md border border-border bg-surface px-2 py-1 text-xs text-foreground shadow-sm motion-safe:animate-fade-in", className), children: text }));
}
