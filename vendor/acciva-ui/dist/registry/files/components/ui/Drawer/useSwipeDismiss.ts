import type { PointerEvent as ReactPointerEvent, RefObject } from "react";
import { isClosingFlickFromPeek, releasePointer, startPointerDrag, summarizeDrag, trackPointerMove, type DragState } from "@/components/ui/Drawer/dragState";
import type { DrawerDetent, DrawerSide } from "@/components/ui/Drawer/types";

/**
 * Returns `[onPointerDown, onPointerMove, onPointerUp, onPointerCancel]`.
 * Swipe-to-dismiss tracks the same samples as a resize drag but never resizes and
 * never snaps: only a closing flick (same velocity, travel and origin tolerance)
 * dismisses, everything else settles back where it was.
 */
export function useSwipeDismiss(
  swipeGestureEnabled: boolean,
  isVertical: boolean,
  resolvedSide: DrawerSide,
  restSize: number,
  detentSizes: Record<DrawerDetent, number>,
  requestClose: () => void,
  dragStateRef: RefObject<DragState | null>,
) {
  const handleSwipePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!swipeGestureEnabled) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    dragStateRef.current = startPointerDrag(event, isVertical, restSize);
  };

  const handleSwipePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const swipe = dragStateRef.current;
    if (!swipe) return;
    trackPointerMove(swipe, event, isVertical, resolvedSide, detentSizes.full);
  };

  const endSwipe = (event: ReactPointerEvent<HTMLButtonElement>, commit: boolean) => {
    const swipe = dragStateRef.current;
    dragStateRef.current = null;
    releasePointer(event);
    if (!swipe || !commit || detentSizes.full <= 0) return;
    const { last, velocity, travelDistance } = summarizeDrag(swipe);
    if (isClosingFlickFromPeek(swipe, velocity, travelDistance, last, detentSizes.peek)) {
      requestClose();
    }
  };

  return [
    handleSwipePointerDown,
    handleSwipePointerMove,
    (event: ReactPointerEvent<HTMLButtonElement>) => endSwipe(event, true),
    (event: ReactPointerEvent<HTMLButtonElement>) => endSwipe(event, false),
  ] as const;
}
