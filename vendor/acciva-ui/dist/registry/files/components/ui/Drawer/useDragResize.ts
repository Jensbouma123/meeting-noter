import type { PointerEvent as ReactPointerEvent, RefObject } from "react";
import { DISMISS_SIZE_FRACTION, DISMISS_TRAVEL_PX } from "@/components/ui/Drawer/constants";
import {
  isClosingFlickFromPeek,
  releasePointer,
  startPointerDrag,
  summarizeDrag,
  trackPointerMove,
  type DragState,
} from "@/components/ui/Drawer/dragState";
import { pickDetentTarget } from "@/components/ui/Drawer/snapTargets";
import { DRAWER_DETENTS, type DrawerDetent, type DrawerSide } from "@/components/ui/Drawer/types";

/** Returns `[onPointerDown, onPointerMove, onPointerUp, onPointerCancel]`. Resize drag on the handle slider: tracks the pointer and snaps to a detent on release. */
export function useDragResize(
  dragEnabled: boolean,
  isVertical: boolean,
  resolvedSide: DrawerSide,
  restSize: number,
  detentSizes: Record<DrawerDetent, number>,
  detentOrder: number[],
  detentIndex: number,
  commitDetent: (next: DrawerDetent) => void,
  setSettled: (settled: boolean) => void,
  setDragSize: (size: number | null) => void,
  requestClose: () => void,
  dragStateRef: RefObject<DragState | null>,
) {
  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!dragEnabled) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    dragStateRef.current = startPointerDrag(event, isVertical, restSize);
    setDragSize(restSize);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragStateRef.current;
    if (!drag) return;
    setDragSize(trackPointerMove(drag, event, isVertical, resolvedSide, detentSizes.full));
  };

  const endDrag = (event: ReactPointerEvent<HTMLButtonElement>, commit: boolean) => {
    const drag = dragStateRef.current;
    dragStateRef.current = null;
    releasePointer(event);
    if (!drag || !commit || detentSizes.full <= 0) {
      setDragSize(null);
      return;
    }
    const { last, velocity, travelDistance } = summarizeDrag(drag);
    const peek = detentSizes.peek;

    const isDraggedPastDismissThreshold =
      last.h < peek * DISMISS_SIZE_FRACTION || (last.h < peek && travelDistance <= -DISMISS_TRAVEL_PX);

    // Combined-mode dismissal rides this same release: the slider dismisses past
    // the lowest detent when dragged out or flicked, whether or not the
    // standalone swipe grabber exists. This path is unconditional in `draggable`,
    // so a draggable drawer keeps dismissing when `swipeToDismiss` is off.
    if (isDraggedPastDismissThreshold || isClosingFlickFromPeek(drag, velocity, travelDistance, last, peek)) {
      setDragSize(null);
      requestClose();
      return;
    }

    const targetIndex = pickDetentTarget(last.h, velocity, detentOrder, travelDistance, detentIndex);
    setSettled(true);
    setDragSize(null);
    commitDetent(DRAWER_DETENTS[targetIndex]);
  };

  return [
    handlePointerDown,
    handlePointerMove,
    (event: ReactPointerEvent<HTMLButtonElement>) => endDrag(event, true),
    (event: ReactPointerEvent<HTMLButtonElement>) => endDrag(event, false),
  ] as const;
}
