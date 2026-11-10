import type { ScrollViewArrows, ScrollViewFadeEdges, ScrollViewState, ScrollViewWrapAt } from "./types.js";
interface ScrollViewChromeProps {
    isHorizontal: boolean;
    regionId: string;
    fadeEdges: ScrollViewFadeEdges;
    showArrows: ScrollViewArrows;
    wrapAt: ScrollViewWrapAt;
    scrollState: ScrollViewState;
    startArrowAriaLabel?: string;
    endArrowAriaLabel?: string;
    onStart: () => void;
    onEnd: () => void;
}
export declare function ScrollViewChrome({ isHorizontal, regionId, fadeEdges, showArrows, wrapAt, scrollState, startArrowAriaLabel, endArrowAriaLabel, onStart, onEnd, }: ScrollViewChromeProps): import("react").JSX.Element;
export {};
