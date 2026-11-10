import { useRef, useState } from "react";
import { VELOCITY_WINDOW_MS } from "../Drawer/constants.js";
import { summarizeDrag } from "../Drawer/dragState.js";
import { pickDetentTarget } from "../Drawer/snapTargets.js";
/** Movement below this is a tap, so the handle's click still toggles. */
const DRAG_SLOP_PX = 4;
/** A press on one of these inside the peek row is that control's own action, never a drag. */
const INTERACTIVE = "a[href],button,input,select,textarea,label,[role=button],[tabindex]";
/**
 * Pointer drag on the handle + peek row, and the scroll-at-top pull in the body. Works in
 * "visible body px" so `Drawer`'s `pickDetentTarget`/`summarizeDrag` apply unchanged.
 * Returns `offset`: the panel's translate in px mid-drag, `null` at rest (CSS owns it then).
 */
export function useDrawerDrag({ panelRef, headerRef, order, snap, commit, enabled = true }) {
    const [offset, setOffset] = useState(null);
    const dragRef = useRef(null);
    const touchRef = useRef(null);
    const sizesFor = (range) => order.map((s) => (s === "peek" ? 0 : s === "half" ? range / 2 : range));
    const begin = (y) => {
        const panel = panelRef.current?.getBoundingClientRect().height ?? 0;
        const header = headerRef.current?.getBoundingClientRect().height ?? 0;
        const range = Math.max(0, panel - header);
        const start = sizesFor(range)[order.indexOf(snap)];
        return { startCoord: y, startSize: start, samples: [{ t: performance.now(), h: start }], range, moved: false };
    };
    const track = (drag, y) => {
        const size = Math.max(0, Math.min(drag.range, drag.startSize - (y - drag.startCoord)));
        const now = performance.now();
        drag.samples.push({ t: now, h: size });
        while (drag.samples.length > 1 && now - drag.samples[0].t > VELOCITY_WINDOW_MS)
            drag.samples.shift();
        setOffset(drag.range - size);
    };
    const settle = (drag) => {
        const { last, velocity, travelDistance } = summarizeDrag(drag);
        commit(order[pickDetentTarget(last.h, velocity, sizesFor(drag.range), travelDistance, order.indexOf(snap))]);
    };
    const onPointerDown = (event) => {
        if (event.pointerType === "mouse" && event.button !== 0)
            return;
        const control = event.target.closest(INTERACTIVE);
        if (control && !control.hasAttribute("data-bottom-nav-drawer-handle"))
            return;
        dragRef.current = begin(event.clientY);
    };
    const onPointerMove = (event) => {
        const drag = dragRef.current;
        if (!drag)
            return;
        if (!drag.moved) {
            if (Math.abs(event.clientY - drag.startCoord) < DRAG_SLOP_PX)
                return;
            // Capture only once it is a drag: capturing on press would retarget the tap's click.
            drag.moved = true;
            event.currentTarget.setPointerCapture?.(event.pointerId);
        }
        track(drag, event.clientY);
    };
    const onPointerUp = (event) => {
        const drag = dragRef.current;
        dragRef.current = null;
        if (event.currentTarget.hasPointerCapture?.(event.pointerId))
            event.currentTarget.releasePointerCapture(event.pointerId);
        setOffset(null);
        if (drag?.moved)
            settle(drag);
    };
    const onPointerCancel = () => {
        dragRef.current = null;
        setOffset(null);
    };
    // The open body keeps native touch scrolling. A pull down that starts at scrollTop 0 turns
    // into a drag that follows the finger; a move up, or any scroll, hands it back to the browser
    // (`overscroll-contain` on the body stops it chaining to the page).
    const onTouchStart = (event) => {
        const atTop = event.currentTarget.scrollTop <= 0 && event.touches.length === 1;
        touchRef.current = atTop ? begin(event.touches[0].clientY) : null;
    };
    const onTouchMove = (event) => {
        const drag = touchRef.current;
        if (!drag)
            return;
        const y = event.touches[0].clientY;
        if (!drag.moved) {
            if (event.currentTarget.scrollTop > 0 || y - drag.startCoord < -DRAG_SLOP_PX)
                touchRef.current = null;
            else if (y - drag.startCoord >= DRAG_SLOP_PX)
                drag.moved = true;
            else
                return;
        }
        if (drag.moved)
            track(drag, y);
    };
    const onTouchEnd = () => {
        const drag = touchRef.current;
        touchRef.current = null;
        setOffset(null);
        if (drag?.moved)
            settle(drag);
    };
    if (!enabled)
        return { offset: null, header: {}, body: {} };
    return {
        offset,
        header: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel },
        body: { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel: onTouchEnd },
    };
}
