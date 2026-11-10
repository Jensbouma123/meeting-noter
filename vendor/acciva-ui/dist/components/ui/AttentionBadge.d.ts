import type { HTMLAttributes } from "react";
import { type SizeTier } from "../../lib/sizing-tokens/index.js";
export type AttentionReason = "grill" | "compare" | "permission" | "stuck";
export type AttentionBadgeSize = Extract<SizeTier, "xxs" | "xs" | "sm" | "md">;
export interface AttentionBadgeProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children" | "onSelect"> {
    reason: AttentionReason;
    display?: "label" | "indicator";
    size?: AttentionBadgeSize;
    /** Overrides the reason text (localisation); never blank. */
    label?: string;
    /** `indicator` only — hides it when adjacent text already states the reason. */
    decorative?: boolean;
}
export declare function AttentionBadge({ reason, display, size, label, decorative, className, ...props }: AttentionBadgeProps): import("react").JSX.Element;
