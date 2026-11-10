import { cn } from "../../../lib/utils.js";
/** `group/table` + presence attributes on `<table>` let cells pick density and stickiness in CSS, so the parts stay Server Components. */
export const TABLE_CLASS = "group/table w-full border-collapse text-left text-sm";
/** Padding per density: compact on the base, comfortable via `data-compact` absence. */
const CELL_PADDING = "px-4 py-3 group-data-compact/table:px-3 group-data-compact/table:py-2";
/** First column stays put while the rest scrolls; solid `bg-surface` so scrolled cells don't show through. */
const STICKY_FIRST = "group-data-sticky-first/table:first:sticky group-data-sticky-first/table:first:left-0 group-data-sticky-first/table:first:z-10 group-data-sticky-first/table:first:bg-surface";
export const HEAD_CELL_CLASS = cn(CELL_PADDING, STICKY_FIRST, "font-medium text-muted-foreground");
export const ROW_HEAD_CLASS = cn(CELL_PADDING, STICKY_FIRST, "whitespace-nowrap text-left font-medium text-foreground");
export const CELL_CLASS = cn(CELL_PADDING, STICKY_FIRST, "align-top text-foreground");
export const HEAD_ROW_CLASS = "border-b border-border bg-elevation-1";
export const BODY_ROW_CLASS = "border-b border-border last:border-0";
