import type { SizeTier } from "@/lib/sizing-tokens/index";
import type { BadgeTint, BadgeTone } from "@/components/ui/Badge/types";

export const toneClasses: Record<BadgeTone, string> = {
  primary:
    "bg-primary-500/10 text-primary-900 border border-primary-500/20 dark:bg-primary-400/15 dark:text-primary-300 dark:border-primary-400/30",
  secondary:
    "bg-secondary-500/10 text-secondary-900 border border-secondary-500/20 dark:bg-secondary-400/15 dark:text-secondary-300 dark:border-secondary-400/30",
  accent:
    "bg-accent-500/10 text-accent-900 border border-accent-500/20 dark:bg-accent-400/15 dark:text-accent-300 dark:border-accent-400/30",
  success:
    "bg-success/10 text-success-900 border border-success/20 dark:bg-success/15 dark:text-success-300 dark:border-success/30",
  warning:
    "bg-warning/10 text-warning-950 border border-warning/20 dark:bg-warning/15 dark:text-warning-300 dark:border-warning/30",
  danger:
    "bg-danger/10 text-danger-900 border border-danger/20 dark:bg-danger/15 dark:text-danger-300 dark:border-danger/30",
  info:
    "bg-info/10 text-info-900 border border-info/20 dark:bg-info/15 dark:text-info-300 dark:border-info/30",
  neutral:
    "bg-surface text-foreground border border-border dark:bg-elevation-2 dark:text-foreground dark:border-border",
};

// Tint fill/border follow the tone opacity steps (`/10`→`/15`, `/20`→`/30` in dark mode).
export const tintClasses: Record<BadgeTint, { surface: string; dot: string }> = {
  "chart-1": { surface: "bg-chart-1/10 border-chart-1/20 dark:bg-chart-1/15 dark:border-chart-1/30", dot: "bg-chart-1" },
  "chart-2": { surface: "bg-chart-2/10 border-chart-2/20 dark:bg-chart-2/15 dark:border-chart-2/30", dot: "bg-chart-2" },
  "chart-3": { surface: "bg-chart-3/10 border-chart-3/20 dark:bg-chart-3/15 dark:border-chart-3/30", dot: "bg-chart-3" },
  "chart-4": { surface: "bg-chart-4/10 border-chart-4/20 dark:bg-chart-4/15 dark:border-chart-4/30", dot: "bg-chart-4" },
  "chart-5": { surface: "bg-chart-5/10 border-chart-5/20 dark:bg-chart-5/15 dark:border-chart-5/30", dot: "bg-chart-5" },
  "chart-6": { surface: "bg-chart-6/10 border-chart-6/20 dark:bg-chart-6/15 dark:border-chart-6/30", dot: "bg-chart-6" },
  "chart-7": { surface: "bg-chart-7/10 border-chart-7/20 dark:bg-chart-7/15 dark:border-chart-7/30", dot: "bg-chart-7" },
  "chart-8": { surface: "bg-chart-8/10 border-chart-8/20 dark:bg-chart-8/15 dark:border-chart-8/30", dot: "bg-chart-8" },
};

export const dotClasses: Record<BadgeTone, string> = {
  primary: "bg-primary-500",
  secondary: "bg-secondary-500",
  accent: "bg-accent-500",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
  neutral: "bg-muted-foreground",
};

export const chipDotClasses = {
  unselected: "bg-muted-foreground",
  selected: "bg-primary-500 dark:bg-primary-400",
} as const;

export const chipStateClasses = {
  unselected:
    "border-border bg-surface text-foreground hover:bg-elevation-2 active:bg-elevation-3 dark:bg-elevation-2 dark:hover:bg-elevation-3 dark:active:bg-elevation-4",
  selected:
    "border-primary-500 bg-primary-500/10 text-primary-900 hover:bg-primary-500/15 active:bg-primary-500/20 dark:border-primary-400 dark:bg-primary-400/15 dark:text-primary-300",
} as const;

// The chip's right padding collapses when a dismiss button follows the label: the button
// carries its own padding, so the shared control padding would double up.
export const CHIP_PADDING_RIGHT_WITH_DISMISS: Record<SizeTier, string> = {
  xxs: "pr-0.5",
  xs: "pr-0.5",
  sm: "pr-1",
  md: "pr-1",
  lg: "pr-1.5",
  xl: "pr-1.5",
  "2xl": "pr-2",
  "3xl": "pr-2",
};

// Never below size-6 (24x24px): the dismiss button is its own target, and SC 2.5.8 applies to
// it independently of the chip that contains it.
export const CHIP_DISMISS_SIZE: Record<SizeTier, string> = {
  xxs: "size-6",
  xs: "size-6",
  sm: "size-6",
  md: "size-6",
  lg: "size-7",
  xl: "size-8",
  "2xl": "size-9",
  "3xl": "size-10",
};
