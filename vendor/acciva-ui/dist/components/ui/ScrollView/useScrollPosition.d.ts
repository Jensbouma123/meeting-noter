import { type RefObject } from "react";
interface UseScrollPositionOptions {
    isHorizontal: boolean;
    step: number | undefined;
    viewportRef: RefObject<HTMLDivElement | null>;
}
export declare function useScrollPosition({ isHorizontal, step, viewportRef }: UseScrollPositionOptions): {
    getScrollDelta: (customDelta?: number) => number;
    scrollByDelta: (delta: number, behavior?: ScrollBehavior) => void;
    scrollToStart: (behavior?: ScrollBehavior) => void;
    scrollToEnd: (behavior?: ScrollBehavior) => void;
    scrollToPosition: (options: ScrollToOptions | number) => void;
};
export {};
