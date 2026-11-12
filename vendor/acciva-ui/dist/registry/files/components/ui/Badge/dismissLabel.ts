import type { ReactNode } from "react";

/**
 * Names that identify no particular chip. Rejected outright: these are precisely the labels that
 * turn a filter row into N indistinguishable "Remove" buttons.
 */
const CONTENTLESS_DISMISS_LABELS: ReadonlySet<string> = new Set([
  "x",
  "close",
  "clear",
  "cancel",
  "remove",
  "dismiss",
  "delete",
  "remove it",
  "remove this",
  "remove item",
  "remove tag",
  "remove chip",
  "remove badge",
  "remove filter",
  "remove this filter",
  "clear filter",
  "delete item",
  "close chip",
]);

function normalizeLabel(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/**
 * Resolves the dismiss button's accessible name and, outside production, reports the ways it can
 * fail to identify its own chip. It always returns *some* name — a shipped button with no name at
 * all would be a worse outcome than a poorly worded one.
 */
export function resolveDismissLabel(dismissLabel: string | undefined, children: ReactNode): string {
  const childText = typeof children === "string" ? children.trim() : "";
  const explicit = dismissLabel?.trim() ?? "";
  const resolved = explicit || (childText ? `Remove ${childText}` : "");

  if (process.env.NODE_ENV !== "production") {
    const prefix = '[a11y] <Badge variant="chip" onDismiss>';
    if (!resolved) {
      console.error(
        `${prefix} needs a \`dismissLabel\`. The dismiss control is icon-only, so it is the button's entire accessible name (WCAG 2.2 AA SC 4.1.2).`,
      );
    } else if (dismissLabel !== undefined && !explicit) {
      console.error(
        `${prefix} was given a blank \`dismissLabel\`; the button fell back to "${resolved}". Pass a real name or drop the prop entirely (WCAG 2.2 AA SC 4.1.2).`,
      );
    } else if (explicit && !childText && CONTENTLESS_DISMISS_LABELS.has(normalizeLabel(explicit))) {
      console.error(
        `${prefix} was given the generic \`dismissLabel\` "${explicit}", which names no particular chip. Several chips in a row would all announce as "${explicit}". Name the chip it removes, e.g. "Remove Pending filter" (WCAG 2.2 AA SC 4.1.2, SC 2.4.6).`,
      );
    } else if (explicit && childText && !normalizeLabel(explicit).includes(normalizeLabel(childText))) {
      console.error(
        `${prefix} has \`dismissLabel\` "${explicit}", which does not mention the chip's own text "${childText}". A screen-reader user hears only the label, so it has to identify which chip it removes (WCAG 2.2 AA SC 4.1.2, SC 2.4.6).`,
      );
    }
  }

  return resolved;
}
