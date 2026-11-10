import type { ReactNode } from "react";
/**
 * Resolves the dismiss button's accessible name and, outside production, reports the ways it can
 * fail to identify its own chip. It always returns *some* name — a shipped button with no name at
 * all would be a worse outcome than a poorly worded one.
 */
export declare function resolveDismissLabel(dismissLabel: string | undefined, children: ReactNode): string;
