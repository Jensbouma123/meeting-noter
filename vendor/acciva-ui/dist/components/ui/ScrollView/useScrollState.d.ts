import { type RefObject, type UIEvent } from "react";
import type { ScrollViewProps, ScrollViewState } from "./types.js";
interface UseScrollStateOptions {
    isHorizontal: boolean;
    viewportRef: RefObject<HTMLDivElement | null>;
    contentRef: RefObject<HTMLDivElement | null>;
    onScroll: ScrollViewProps["onScroll"];
    onScrollChange: ScrollViewProps["onScrollChange"];
}
export declare function useScrollState({ isHorizontal, viewportRef, contentRef, onScroll, onScrollChange, }: UseScrollStateOptions): {
    scrollState: ScrollViewState;
    handleScroll: (event: UIEvent<HTMLDivElement>) => void;
};
export {};
