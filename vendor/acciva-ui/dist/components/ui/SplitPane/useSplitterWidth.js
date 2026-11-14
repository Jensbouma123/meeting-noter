import { useCallback, useEffect, useRef, useState, } from "react";
import { KEYBOARD_STEP_PX, PAGE_STEP_PX, SIDEBAR_MAX_PX, SIDEBAR_MIN_PX, SIDEBAR_WIDTH_PX, } from "./SplitPaneConstants.js";
const clampWidth = (width) => Math.min(SIDEBAR_MAX_PX, Math.max(SIDEBAR_MIN_PX, width));
export function useSplitterWidth(defaultSidebarWidth, onSidebarWidthChange) {
    const [widthPx, setWidthPx] = useState(() => SIDEBAR_WIDTH_PX[defaultSidebarWidth]);
    const dragRef = useRef(null);
    // Read through a ref so a drag in flight always reports to the latest callback.
    const onChangeRef = useRef(onSidebarWidthChange);
    useEffect(() => {
        onChangeRef.current = onSidebarWidthChange;
    }, [onSidebarWidthChange]);
    const endDrag = useCallback(() => {
        const drag = dragRef.current;
        if (!drag)
            return;
        window.removeEventListener("pointermove", drag.move);
        window.removeEventListener("pointerup", drag.end);
        window.removeEventListener("pointercancel", drag.end);
        dragRef.current = null;
    }, []);
    // Unmounting mid-drag must not leave window listeners behind.
    useEffect(() => () => endDrag(), [endDrag]);
    const commit = useCallback((width) => {
        const next = clampWidth(Math.round(width));
        setWidthPx(next);
        onChangeRef.current?.(next);
    }, []);
    const handleKeyDown = (event) => {
        const actions = {
            ArrowRight: widthPx + KEYBOARD_STEP_PX,
            ArrowUp: widthPx + KEYBOARD_STEP_PX,
            ArrowLeft: widthPx - KEYBOARD_STEP_PX,
            ArrowDown: widthPx - KEYBOARD_STEP_PX,
            PageUp: widthPx + PAGE_STEP_PX,
            PageDown: widthPx - PAGE_STEP_PX,
            Home: SIDEBAR_MIN_PX,
            End: SIDEBAR_MAX_PX,
        };
        if (event.key in actions) {
            event.preventDefault();
            commit(actions[event.key]);
        }
    };
    const handlePointerDown = (event) => {
        // Stops text selection from starting while the pane is dragged.
        event.preventDefault();
        endDrag();
        const startX = event.clientX;
        const startWidth = widthPx;
        const move = (moveEvent) => commit(startWidth + (moveEvent.clientX - startX));
        // pointercancel ends the drag too: browsers fire it instead of pointerup.
        const end = () => endDrag();
        dragRef.current = { move, end };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", end);
        window.addEventListener("pointercancel", end);
    };
    return { widthPx, handleKeyDown, handlePointerDown };
}
