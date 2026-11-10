import type { HTMLAttributes } from "react";
import { type ResponsiveSize, type SizeTier } from "../../lib/sizing-tokens.js";
export type StatusDotTone = "neutral" | "info" | "success" | "warning" | "danger" | "brand";
export interface StatusDotProps extends HTMLAttributes<HTMLSpanElement> {
    /** Semantic colour role, never a colour name. */
    tone?: StatusDotTone;
    /** Accessible name — the state in words. Required so the dot is never colour alone. */
    label: string;
    /** Dot diameter tier. Defaults to `xs` (8px), the audit's `Spacing.xs` dot. */
    size?: ResponsiveSize<SizeTier>;
    /** Radiating ring for ongoing activity. Static under reduced motion. */
    pulse?: boolean;
    /** Renders `label` as visible text beside the dot. */
    showLabel?: boolean;
}
/**
 * A small presence/status dot with a required accessible name. `role="img"` names it via
 * `aria-label`; the dot (and the optional visible label text) are presentational children,
 * so the name announces exactly once (SC 4.1.2). Not a control — never attach `onClick`.
 */
export declare function StatusDot({ tone, label, size, pulse, showLabel, className, ...props }: StatusDotProps): import("react").JSX.Element;
