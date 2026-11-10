import { useRef, useState } from "react";
import { useBottomNavHeight } from "../BottomNav/index.js";
import { useDetentSizes } from "./useDetentSizes.js";
import { useDialogLifecycle } from "./useDialogLifecycle.js";
import { useDrawerDevWarnings } from "./useDrawerDevWarnings.js";
import { useDrawerGestures } from "./useDrawerGestures.js";
import { useDrawerLifecycle } from "./useDrawerLifecycle.js";
import { SIDE_AXIS } from "./sideTables.js";
/** Owns every state machine, measurement and gesture hook behind `<Drawer>`. */
export function useDrawerModel(props, elements) {
    const { wrapperRef, sheetRef, contentRef, innerContentRef } = elements;
    const { open, onOpenChange, modality = "modal", side = "bottom", defaultDetent = "half", minSize, defaultSize, maxSize, minHeight, defaultHeight, maxHeight, confirmDismissal, "aria-label": ariaLabel, "aria-labelledby": ariaLabelledBy, } = props;
    const dragStateRef = useRef(null);
    const [confirmingDiscard, setConfirmingDiscard] = useState(false);
    const isPersistent = modality === "persistent";
    // A persistent drawer's `md:` layout *is* the side panel, so it stays bottom-anchored
    // at base width instead of growing a second, divergent horizontal implementation.
    const resolvedSide = isPersistent ? "bottom" : side;
    const axis = SIDE_AXIS[resolvedSide];
    const isVertical = axis === "vertical";
    const resolvedMinSize = minSize ?? minHeight;
    const resolvedDefaultSize = defaultSize ?? defaultHeight;
    const resolvedMaxSize = maxSize ?? maxHeight;
    // Every dismissal path (backdrop, Escape, grabber, close control, drag/flick) funnels here.
    const requestClose = () => {
        if (confirmDismissal?.isDirty)
            setConfirmingDiscard(true);
        else
            onOpenChange(false);
    };
    const [mounted, entered, settled, sizeResolved, setSettled, setSizeResolved, uncontrolledDetent, setUncontrolledDetent, dragSize, setDragSize] = useDrawerLifecycle(open, defaultDetent, dragStateRef);
    useDialogLifecycle(open, mounted, isPersistent, sheetRef);
    const detentSizes = useDetentSizes(open, modality, axis, isVertical, resolvedMinSize, resolvedDefaultSize, resolvedMaxSize, wrapperRef, sheetRef, contentRef, innerContentRef, setSizeResolved);
    const [detent, detentControl, restSize, docked, dragEnabled, showSwipeGrabber, drag, swipe] = useDrawerGestures(props, open, isPersistent, isVertical, resolvedSide, detentSizes, setSettled, setDragSize, uncontrolledDetent, setUncontrolledDetent, dragStateRef, requestClose);
    const bottomNavHeight = useBottomNavHeight();
    useDrawerDevWarnings(open, isPersistent, side, ariaLabel, ariaLabelledBy);
    return {
        mounted, entered, settled, sizeResolved, dragSize, detent, detentControl, restSize, docked, dragEnabled,
        showSwipeGrabber, drag, swipe, confirmingDiscard, setConfirmingDiscard, requestClose, detentSizes,
        bottomNavHeight, resolvedSide, isPersistent, isVertical,
    };
}
