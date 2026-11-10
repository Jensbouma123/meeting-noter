import type { HTMLAttributes, KeyboardEvent, RefObject } from "react";
interface UseScrollKeyboardOptions {
    isHorizontal: boolean;
    viewportRef: RefObject<HTMLDivElement | null>;
    onKeyDown: HTMLAttributes<HTMLDivElement>["onKeyDown"];
    getScrollDelta: (customDelta?: number) => number;
    scrollByDelta: (delta: number, behavior?: ScrollBehavior) => void;
    scrollToStart: (behavior?: ScrollBehavior) => void;
    scrollToEnd: (behavior?: ScrollBehavior) => void;
}
export declare function useScrollKeyboard({ isHorizontal, viewportRef, onKeyDown, getScrollDelta, scrollByDelta, scrollToStart, scrollToEnd, }: UseScrollKeyboardOptions): (event: KeyboardEvent<HTMLDivElement>) => void;
export {};
