import { useCallback, useState, } from "react";
import { KEYBOARD_STEP_PX, PAGE_STEP_PX, SIDEBAR_MAX_PX, SIDEBAR_MIN_PX, SIDEBAR_WIDTH_PX, } from "./SplitPaneConstants.js";
const clampWidth = (width) => Math.min(SIDEBAR_MAX_PX, Math.max(SIDEBAR_MIN_PX, width));
export function useSplitterWidth(defaultSidebarWidth, onSidebarWidthChange) {
    const [widthPx, setWidthPx] = useState(() => SIDEBAR_WIDTH_PX[defaultSidebarWidth]);
    const commit = useCallback((width) => {
        const next = clampWidth(Math.round(width));
        setWidthPx(next);
        onSidebarWidthChange?.(next);
    }, [onSidebarWidthChange]);
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
        const startX = event.clientX;
        const startWidth = widthPx;
        const move = (moveEvent) => commit(startWidth + (moveEvent.clientX - startX));
        const up = () => {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", up);
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
    };
    return { widthPx, handleKeyDown, handlePointerDown };
}
