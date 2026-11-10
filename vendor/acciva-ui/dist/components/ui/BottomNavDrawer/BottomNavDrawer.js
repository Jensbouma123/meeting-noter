"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useId, useLayoutEffect, useRef } from "react";
import { cn } from "../../../lib/utils.js";
import { HIDE_AT_CLASSES } from "../BottomNav/BottomNavClasses.js";
import { useBottomNavHeight } from "../BottomNav/useBottomNavHeight.js";
import { BODY_CLASS, GRIP_CLASS, HANDLE_CLASS, HEADER_CLASS, PANEL_CLASS, PANEL_MOTION_CLASS, HANDLE_GRAB_CLASS, PEEK_CLASS, ROOT_CLASS, SNAP_TRANSLATE } from "./classes.js";
import { useHugSizes } from "./useHugSizes.js";
import { useDrawerDrag } from "./useDrawerDrag.js";
import { usePeekHeight } from "./usePeekHeight.js";
import { useSnapState } from "./useSnapState.js";
/**
 * A non-modal drawer behind a `BottomNav`, growing out of the bar's top edge. Collapsed, the
 * handle and peek row show; open, the body. No dialog, no focus trap, no backdrop: the page
 * and the bar stay usable, and the collapsed body is `inert` (SC 2.4.3).
 */
export function BottomNavDrawer({ label, children, peek, snap: snapProp, defaultSnap, open, defaultOpen = false, onOpenChange, halfDetent = false, onSnapChange, hug = false, draggable = true, hideAt = "md", id, className, }) {
    const generatedId = useId();
    const bodyId = id ?? generatedId;
    const navHeight = useBottomNavHeight();
    const headerRef = usePeekHeight();
    const panelRef = useRef(null);
    const handleRef = useRef(null);
    const bodyRef = useRef(null);
    const hugSizes = useHugSizes(hug, panelRef, headerRef);
    // Settled panel height per snap, read live: layout heights do not depend on the translate.
    const heightOf = (target) => {
        const panel = panelRef.current?.getBoundingClientRect().height ?? 0;
        const header = headerRef.current?.getBoundingClientRect().height ?? 0;
        if (target === "peek")
            return header;
        if (target === "full")
            return panel;
        return hug ? hugSizes.half : header + (panel - header) / 2;
    };
    const { snap, order, setSnap } = useSnapState({
        snap: snapProp, defaultSnap, open, defaultOpen, halfDetent, onOpenChange, onSnapChange, heightOf,
    });
    const isOpen = snap !== "peek";
    // Collapsing with focus in the body would strand it on an `inert` node: hand it to the handle.
    const commit = (next) => {
        if (next === "peek" && bodyRef.current?.contains(document.activeElement))
            handleRef.current?.focus();
        setSnap(next);
    };
    // A controlled `open={false}` collapses without passing through `commit`.
    useLayoutEffect(() => {
        if (snap === "peek" && bodyRef.current?.contains(document.activeElement))
            handleRef.current?.focus();
    }, [snap]);
    const drag = useDrawerDrag({ panelRef, headerRef, order, snap, commit, enabled: draggable });
    const index = order.indexOf(snap);
    const onHandleClick = () => commit(order[(index + 1) % order.length]);
    const onHandleKeyDown = (event) => {
        if (!halfDetent || (event.key !== "ArrowUp" && event.key !== "ArrowDown"))
            return;
        event.preventDefault();
        const step = event.key === "ArrowUp" ? 1 : -1;
        commit(order[Math.min(order.length - 1, Math.max(0, index + step))]);
    };
    const onKeyDown = (event) => {
        if (event.key !== "Escape" || !isOpen)
            return;
        event.stopPropagation();
        handleRef.current?.focus();
        commit("peek");
    };
    // `hug` places `half` at half the hugged panel; everything else rests on the CSS translates.
    const restTranslate = hug && snap === "half" && hugSizes.full > 0 ? `0 ${hugSizes.full - hugSizes.half}px` : SNAP_TRANSLATE[snap];
    const translate = drag.offset === null ? restTranslate : `0 ${drag.offset}px`;
    return (_jsx("section", { "aria-label": label, onKeyDown: onKeyDown, className: cn(ROOT_CLASS, HIDE_AT_CLASSES[hideAt], className), style: navHeight > 0 ? { bottom: navHeight } : undefined, children: _jsxs("div", { ref: panelRef, "data-snap": snap, className: cn(PANEL_CLASS, drag.offset === null && PANEL_MOTION_CLASS), style: { translate }, children: [_jsxs("div", { ref: headerRef, className: draggable ? HEADER_CLASS : undefined, ...drag.header, children: [_jsx("button", { ref: handleRef, type: "button", "data-bottom-nav-drawer-handle": true, "aria-label": label, "aria-expanded": isOpen, "aria-controls": bodyId, onClick: onHandleClick, onKeyDown: onHandleKeyDown, className: cn(HANDLE_CLASS, draggable && HANDLE_GRAB_CLASS), children: _jsx("span", { "aria-hidden": "true", className: GRIP_CLASS }) }), peek ? _jsx("div", { className: PEEK_CLASS, children: peek }) : null] }), _jsx("div", { id: bodyId, ref: bodyRef, inert: !isOpen, className: BODY_CLASS, ...drag.body, children: children })] }) }));
}
