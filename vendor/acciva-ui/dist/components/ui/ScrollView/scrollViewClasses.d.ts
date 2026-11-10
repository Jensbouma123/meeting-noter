import type { ScrollViewGap, ScrollViewPadding, ScrollViewScrollbar, ScrollViewSnap, ScrollViewWrapAt } from "./types.js";
export declare const GAP_CLASSES: Record<ScrollViewGap, string>;
export declare const PADDING_CLASSES: Record<ScrollViewPadding, string>;
export declare const WRAP_AT_CLASSES: Record<ScrollViewWrapAt, string>;
export declare const WRAP_AT_HIDE_CONTROLS_CLASSES: Record<ScrollViewWrapAt, string>;
export declare function getSnapClasses(snap: ScrollViewSnap, isHorizontal: boolean): string;
export declare function getScrollbarClasses(scrollbar: ScrollViewScrollbar, isHorizontal: boolean): string;
