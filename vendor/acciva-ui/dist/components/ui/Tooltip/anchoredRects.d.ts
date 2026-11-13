export interface AnchoredRects {
    bubble: DOMRect;
    trigger: DOMRect;
}
/**
 * The bubble's and its trigger's rects, only while the bubble is laid out against `trigger`: the
 * bubble names `name` as its `position-anchor` and the trigger, still in the document, declares it.
 * A bubble whose anchor is gone (Chrome drops it at its static position: the window's top-left or
 * mid-air) or that is not shown yet (0x0) yields `null`, so a group morph never starts or ends there.
 */
export declare function anchoredRects(bubble: HTMLElement | null, trigger: HTMLElement | null, name: string): AnchoredRects | null;
