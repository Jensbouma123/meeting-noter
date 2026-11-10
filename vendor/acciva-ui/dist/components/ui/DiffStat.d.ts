import type { HTMLAttributes } from "react";
export interface DiffStatProps extends HTMLAttributes<HTMLSpanElement> {
    /** Lines added. Negative values clamp to zero. */
    additions: number;
    /** Lines removed. Negative values clamp to zero. */
    deletions: number;
}
/** GitHub-style strip length: 5 blocks per stat, split by share of additions. */
export declare const DIFF_STAT_BLOCKS = 5;
/**
 * How many of the 5 strip blocks use the additions (success) fill. The rest use the
 * deletions (danger) fill; with no changes at all every block uses the neutral track.
 * Shared with Swift `AccivaDiffStat.filledBlocks` — keep the two in sync.
 */
export declare function diffStatAddedBlocks(additions: number, deletions: number): number;
/**
 * GitHub-style `+additions / -deletions` counts plus a 5-block strip. Read-only: the
 * counts are text so the strip's colour is never the only channel (SC 1.4.1), the strip
 * is `aria-hidden`, and the whole stat carries one `role="img"` name (SC 4.1.2, 1.1.1).
 */
export declare function DiffStat({ additions, deletions, className, ...props }: DiffStatProps): import("react").JSX.Element;
