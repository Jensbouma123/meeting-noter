import { isClosingFlickFromPeek, releasePointer, startPointerDrag, summarizeDrag, trackPointerMove } from "./dragState.js";
/**
 * Returns `[onPointerDown, onPointerMove, onPointerUp, onPointerCancel]`.
 * Swipe-to-dismiss tracks the same samples as a resize drag but never resizes and
 * never snaps: only a closing flick (same velocity, travel and origin tolerance)
 * dismisses, everything else settles back where it was.
 */
export function useSwipeDismiss(swipeGestureEnabled, isVertical, resolvedSide, restSize, detentSizes, requestClose, dragStateRef) {
    const handleSwipePointerDown = (event) => {
        if (!swipeGestureEnabled)
            return;
        if (event.pointerType === "mouse" && event.button !== 0)
            return;
        dragStateRef.current = startPointerDrag(event, isVertical, restSize);
    };
    const handleSwipePointerMove = (event) => {
        const swipe = dragStateRef.current;
        if (!swipe)
            return;
        trackPointerMove(swipe, event, isVertical, resolvedSide, detentSizes.full);
    };
    const endSwipe = (event, commit) => {
        const swipe = dragStateRef.current;
        dragStateRef.current = null;
        releasePointer(event);
        if (!swipe || !commit || detentSizes.full <= 0)
            return;
        const { last, velocity, travelDistance } = summarizeDrag(swipe);
        if (isClosingFlickFromPeek(swipe, velocity, travelDistance, last, detentSizes.peek)) {
            requestClose();
        }
    };
    return [
        handleSwipePointerDown,
        handleSwipePointerMove,
        (event) => endSwipe(event, true),
        (event) => endSwipe(event, false),
    ];
}
