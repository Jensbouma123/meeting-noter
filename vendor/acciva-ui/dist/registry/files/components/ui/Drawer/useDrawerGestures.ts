import type { RefObject } from "react";
import { COARSE_POINTER_QUERY, DOCKED_MEDIA_QUERY } from "@/components/ui/Drawer/constants";
import type { DragState } from "@/components/ui/Drawer/dragState";
import { useDetentControl } from "@/components/ui/Drawer/useDetentControl";
import { useDragResize } from "@/components/ui/Drawer/useDragResize";
import { useMediaMatch } from "@/components/ui/Drawer/useMediaMatch";
import { useSwipeDismiss } from "@/components/ui/Drawer/useSwipeDismiss";
import type { useDetentSizes } from "@/components/ui/Drawer/useDetentSizes";
import type { DrawerDetent, DrawerProps, DrawerSide } from "@/components/ui/Drawer/types";

/** Returns `[detent, detentControl, restSize, docked, dragEnabled, showSwipeGrabber, drag, swipe]`. Owns detent selection, drag-resize and swipe-dismiss wiring behind `<Drawer>`. */
export function useDrawerGestures(
  props: DrawerProps,
  open: boolean,
  isPersistent: boolean,
  isVertical: boolean,
  resolvedSide: DrawerSide,
  detentSizes: ReturnType<typeof useDetentSizes>,
  setSettled: (settled: boolean) => void,
  setDragSize: (size: number | null) => void,
  uncontrolledDetent: DrawerDetent,
  setUncontrolledDetent: (detent: DrawerDetent) => void,
  dragStateRef: RefObject<DragState | null>,
  requestClose: () => void,
) {
  const { detent: controlledDetent, onSnapChange, draggable = false, swipeToDismiss = true } = props;

  const docked = useMediaMatch(DOCKED_MEDIA_QUERY, isPersistent);
  const dragEnabled = draggable && !docked;
  // `draggable` owns drag-resize + detents, `swipeToDismiss` owns dismissal by
  // gesture, and the two compose: with both on the drag handle below is the single
  // affordance — it drags between detents on every pointer, and a downward flick
  // past the lowest detent dismisses through the same release path (see endDrag).
  // The standalone grabber button only renders when no slider exists to carry the
  // flick. The standalone swipe flick only arms on coarse pointers; the slider
  // dismisses through drag physics on every pointer. The grabber's tap
  // activation stays available on every pointer.
  const showSwipeGrabber = swipeToDismiss && !draggable;
  const coarsePointer = useMediaMatch(COARSE_POINTER_QUERY, open && swipeToDismiss);
  const swipeGestureEnabled = showSwipeGrabber && coarsePointer;

  const detentControl = useDetentControl(
    controlledDetent,
    uncontrolledDetent,
    setUncontrolledDetent,
    detentSizes,
    resolvedSide,
    dragEnabled,
    onSnapChange,
    setSettled,
  );
  const [detent, detentOrder, detentIndex, restSize, commitDetent] = detentControl;

  const drag = useDragResize(
    dragEnabled,
    isVertical,
    resolvedSide,
    restSize,
    detentSizes,
    detentOrder,
    detentIndex,
    commitDetent,
    setSettled,
    setDragSize,
    requestClose,
    dragStateRef,
  );
  const swipe = useSwipeDismiss(swipeGestureEnabled, isVertical, resolvedSide, restSize, detentSizes, requestClose, dragStateRef);

  return [detent, detentControl, restSize, docked, dragEnabled, showSwipeGrabber, drag, swipe] as const;
}
