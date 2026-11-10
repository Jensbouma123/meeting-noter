import type { HTMLAttributes, ReactNode, Ref, UIEvent } from "react";
export type ScrollViewOrientation = "horizontal" | "vertical";
export type ScrollViewFadeEdges = boolean | "start" | "end" | "both" | "none";
export type ScrollViewArrows = boolean | "always" | "hover" | "auto" | "none";
export type ScrollViewSnap = "none" | "start" | "center" | "mandatory" | "proximity";
export type ScrollViewScrollbar = "auto" | "always" | "hidden";
export type ScrollViewWrapAt = "xs" | "sm" | "md" | "lg" | "xl" | "never";
export type ScrollViewGap = "none" | "xs" | "sm" | "md" | "lg" | "xl";
export type ScrollViewPadding = "none" | "xs" | "sm" | "md" | "lg" | "xl";
export interface ScrollViewState {
    scrollLeft: number;
    scrollTop: number;
    scrollWidth: number;
    scrollHeight: number;
    clientWidth: number;
    clientHeight: number;
    canScrollStart: boolean;
    canScrollEnd: boolean;
    isScrollable: boolean;
}
export interface ScrollViewHandle {
    scrollToStart: (behavior?: ScrollBehavior) => void;
    scrollToEnd: (behavior?: ScrollBehavior) => void;
    scrollBy: (delta: number, behavior?: ScrollBehavior) => void;
    scrollTo: (options: ScrollToOptions | number) => void;
    getScrollElement: () => HTMLDivElement | null;
    getContainerElement: () => HTMLDivElement | null;
    getState: () => ScrollViewState;
}
export interface ScrollViewProps extends Omit<HTMLAttributes<HTMLDivElement>, "onScroll"> {
    orientation?: ScrollViewOrientation;
    fadeEdges?: ScrollViewFadeEdges;
    showArrows?: ScrollViewArrows;
    snap?: ScrollViewSnap;
    mouseWheel?: boolean;
    scrollbar?: ScrollViewScrollbar;
    gap?: ScrollViewGap;
    padding?: ScrollViewPadding;
    wrapAt?: ScrollViewWrapAt;
    step?: number;
    scrollRef?: Ref<ScrollViewHandle>;
    contentClassName?: string;
    viewportClassName?: string;
    onScroll?: (event: UIEvent<HTMLDivElement>) => void;
    onScrollChange?: (state: ScrollViewState) => void;
    /** @deprecated Use `aria-label`. Loses to it when both are set. */
    label?: string;
    /**
     * The three names below land on the scrolling viewport — the element that
     * carries `role` and the tab stop — not on the positioning wrapper that
     * `...rest` spreads onto.
     */
    "aria-label"?: string;
    "aria-labelledby"?: string;
    "aria-describedby"?: string;
    startArrowAriaLabel?: string;
    endArrowAriaLabel?: string;
    children?: ReactNode;
}
