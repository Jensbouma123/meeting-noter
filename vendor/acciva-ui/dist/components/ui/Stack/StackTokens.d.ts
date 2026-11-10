import type { ResponsiveDirection, Spacing, StackAlign, StackDirection, StackJustify } from "./StackTypes.js";
/** Gap classes per spacing tier. */
export declare const SPACING_GAP: Record<Spacing, string>;
/** Inset (padding) classes per spacing tier. */
export declare const INSET_PADDING: Record<Spacing, string>;
export declare const DIRECTION_CLASS: Record<StackDirection, string>;
/** Resolves a single or per-breakpoint direction to flex classes (phone default: column). */
export declare function directionClass(direction: StackDirection | ResponsiveDirection): string;
export declare const ALIGN_CLASS: Record<StackAlign, string>;
export declare const JUSTIFY_CLASS: Record<StackJustify, string>;
