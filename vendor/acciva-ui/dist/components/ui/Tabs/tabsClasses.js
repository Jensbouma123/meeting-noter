import { TAB_LIST_PADDING, TAB_RADIUS } from "../../../lib/sizing-tokens/index.js";
export const TAB_LIST_FLOW = {
    horizontal: "tab-scroll max-w-full flex-row items-center touch-pan-x touch-pan-y",
    vertical: "flex-col items-stretch",
};
// The rule an `underline` list draws sits on the edge the tabs stack against: under a
// horizontal row, beside a vertical column. Each tab's own 2px edge overlaps it (see TAB_EDGE).
export const TAB_LIST_SHELL = {
    pill: {
        horizontal: "rounded-lg bg-elevation-2",
        vertical: "rounded-lg bg-elevation-2",
    },
    underline: {
        horizontal: "border-b border-border pt-1",
        vertical: "border-l border-border",
    },
};
// `null` means the variant has no per-tier value for that slot at all — an underline list is
// flush against its rule and an underline tab is square, so neither reads the size ramp.
export const TAB_LIST_INSET = {
    pill: TAB_LIST_PADDING,
    underline: null,
};
export const TAB_SHAPE = {
    pill: TAB_RADIUS,
    underline: null,
};
export const TAB_EDGE = {
    pill: { horizontal: "", vertical: "" },
    underline: {
        horizontal: "justify-center border-b-2 border-transparent",
        vertical: "-ml-px justify-start border-l-2 border-transparent",
    },
};
// `primary-500`/`primary-300` are the two stops on the ramp that hold the 3:1 non-text
// contrast floor (SC 1.4.11) against light and dark backgrounds respectively; the selected
// tab's own label stays `text-foreground` so colour is never the only signal (SC 1.4.1).
export const TAB_SELECTED = {
    pill: "bg-background text-foreground shadow-sm",
    underline: "border-primary-500 text-foreground dark:border-primary-300",
};
// Once the sliding indicator is measured (`data-indicator-ready` on the list) it carries the
// selection, so the per-tab fill/edge used as the SSR / pre-measure fallback goes transparent.
export const TAB_COVERED = {
    pill: "group-data-indicator-ready:bg-transparent group-data-indicator-ready:shadow-none",
    underline: "group-data-indicator-ready:border-transparent",
};
export const INDICATOR = {
    pill: "bg-background shadow-sm",
    underline: "-mt-0.5 h-0.5 bg-primary-500 dark:bg-primary-300",
};
export const TAB_IDLE = {
    // Fills and edges sit behind `not-data-drag-target:` so the grabbed tab never paints hover over the sliding indicator (tabs stack above it).
    pill: "text-muted-foreground hover:text-foreground active:text-foreground not-data-drag-target:hover:bg-elevation-2 not-data-drag-target:active:bg-elevation-3 dark:not-data-drag-target:hover:bg-elevation-3 dark:not-data-drag-target:active:bg-elevation-4",
    underline: "text-muted-foreground hover:text-foreground active:text-foreground not-data-drag-target:hover:border-border not-data-drag-target:active:border-muted-foreground",
};
