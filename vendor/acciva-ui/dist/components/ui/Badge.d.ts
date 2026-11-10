import type { HTMLAttributes } from "react";
import { type ResponsiveSize, type SizeTier } from "../../lib/sizing-tokens.js";
export type BadgeVariant = "primary" | "secondary" | "accent" | "success" | "warning" | "danger" | "info" | "neutral" | "chip";
/** Every variant except `chip` is a tone: a tinted, non-interactive label. */
export type BadgeTone = Exclude<BadgeVariant, "chip">;
/** A categorical series token (`--chart-1`…`--chart-8`). Tone-only; see `tint`. */
export type BadgeTint = "chart-1" | "chart-2" | "chart-3" | "chart-4" | "chart-5" | "chart-6" | "chart-7" | "chart-8";
export interface BadgeBaseProps extends Omit<HTMLAttributes<HTMLSpanElement>, "onSelect"> {
    variant?: BadgeVariant;
    size?: ResponsiveSize<SizeTier>;
    dot?: boolean;
    /**
     * Tone only — fills the label with a categorical series colour instead of the variant's tone,
     * for a label that must tell apart several categories. Text stays `text-foreground` (SC 1.4.3);
     * the series is never the only cue, so pair it with the label text (SC 1.4.1). Ignored for `chip`.
     */
    tint?: BadgeTint;
    /** `variant="chip"` only — renders the label as a toggle button reporting `aria-pressed`. */
    selected?: boolean;
    onSelect?: (selected: boolean) => void;
    /** `variant="chip"` only — disables both the toggle and the dismiss button. */
    disabled?: boolean;
}
/**
 * The dismiss control is an icon-only button, so `dismissLabel` is its entire accessible name and
 * it must name the chip it removes ("Remove Pending filter"). A generic name repeated across a
 * filter row leaves a screen-reader user with N identical "Remove" buttons and no way to tell
 * which one drops which filter (WCAG 2.2 AA SC 4.1.2 Name, Role, Value; SC 2.4.6 Headings and
 * Labels).
 *
 * So the type forces a per-chip name one of two ways: give the chip plain string children and it
 * derives `Remove <children>` for you, or pass `dismissLabel` explicitly. A chip whose children
 * are arbitrary markup has nothing to derive from, so there `dismissLabel` is required.
 */
export type BadgeProps = BadgeBaseProps & ({
    onDismiss: () => void;
    dismissLabel: string;
} | {
    onDismiss: () => void;
    dismissLabel?: undefined;
    children: string;
} | {
    onDismiss?: never;
    dismissLabel?: never;
});
export declare function Badge({ className, variant, size, dot, tint, selected, onSelect, onDismiss, dismissLabel, disabled, children, ...props }: BadgeProps): import("react").JSX.Element;
