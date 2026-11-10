import { type ForwardedRef, type RefObject } from "react";
import type { ScrollViewProps, ScrollViewState } from "./types.js";
interface UseScrollHandleOptions {
    scrollRef: ScrollViewProps["scrollRef"];
    forwardedRef: ForwardedRef<HTMLDivElement>;
    containerRef: RefObject<HTMLDivElement | null>;
    viewportRef: RefObject<HTMLDivElement | null>;
    scrollState: ScrollViewState;
    scrollToStart: (behavior?: ScrollBehavior) => void;
    scrollToEnd: (behavior?: ScrollBehavior) => void;
    scrollByDelta: (delta: number, behavior?: ScrollBehavior) => void;
    scrollToPosition: (options: ScrollToOptions | number) => void;
}
export declare function useScrollHandle({ scrollRef, forwardedRef, containerRef, viewportRef, scrollState, scrollToStart, scrollToEnd, scrollByDelta, scrollToPosition, }: UseScrollHandleOptions): void;
export {};
