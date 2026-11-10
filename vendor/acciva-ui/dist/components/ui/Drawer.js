"use client";
import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "../../lib/utils.js";
import { useScrollLock } from "../../lib/scroll-lock.js";
import { useBottomNavHeight } from "../../components/ui/BottomNav.js";
import { Button } from "../../components/ui/Button.js";
import { Modal } from "../../components/ui/Modal.js";
export const DRAWER_DETENTS = ["peek", "half", "full"];
const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
const DEFAULT_MAX_HEIGHT = "85dvh";
/** 24rem — the width `SettingsSheet`/`Sidebar` already use (Tailwind `max-w-sm`). */
const DEFAULT_MAX_WIDTH = 384;
const MIN_VISIBLE_BACKDROP_PX = 24;
const FLICK_VELOCITY_PX_MS = 0.5;
const FLICK_DISTANCE_THRESHOLD_PX = 30;
const VELOCITY_WINDOW_MS = 100;
const TRANSITION_DURATION_MS = 200;
const PERSISTENT_PEEK_FRACTION = 0.25;
const PERSISTENT_HALF_FRACTION = 0.5;
const DISMISS_SIZE_FRACTION = 0.65;
const DISMISS_TRAVEL_PX = 50;
const FLICK_ORIGIN_TOLERANCE_PX = 20;
/** Matches Tailwind's `md:` breakpoint, where `BottomNav` hides and the panel docks. */
const DOCKED_MEDIA_QUERY = "(min-width: 768px)";
const SIDE_AXIS = {
    bottom: "vertical",
    left: "horizontal",
    right: "horizontal",
};
const GROW_KEYS = {
    bottom: ["ArrowUp", "ArrowRight"],
    left: ["ArrowUp", "ArrowRight"],
    right: ["ArrowUp", "ArrowLeft"],
};
const SHRINK_KEYS = {
    bottom: ["ArrowDown", "ArrowLeft"],
    left: ["ArrowDown", "ArrowLeft"],
    right: ["ArrowDown", "ArrowRight"],
};
const DETENT_LABEL = {
    peek: "Peek",
    half: "Half open",
    full: "Fully open",
};
const DOCKED_WIDTH_CLASS = {
    peek: "md:w-64",
    half: "md:w-80",
    full: "md:w-96",
};
function prefersReducedMotion() {
    var _a;
    return (typeof window !== "undefined" &&
        ((_a = window.matchMedia) === null || _a === void 0 ? void 0 : _a.call(window, "(prefers-reduced-motion: reduce)").matches) === true);
}
/** The panel's real transition length, read from the token the CSS actually uses.
 *  `--motion-spatial` is 180ms on a fine pointer, 260ms under `(pointer: coarse)` and
 *  0ms under `prefers-reduced-motion`, so a hardcoded constant unmounted the sheet
 *  mid-flight on touch. Reading the token keeps the timer and the transition in step. */
function exitDurationMs() {
    if (typeof window === "undefined")
        return 0;
    const raw = getComputedStyle(document.documentElement)
        .getPropertyValue("--motion-spatial")
        .trim();
    if (raw.endsWith("ms"))
        return Number.parseFloat(raw) || 0;
    if (raw.endsWith("s"))
        return (Number.parseFloat(raw) || 0) * 1000;
    return TRANSITION_DURATION_MS;
}
export function resolveLength(value, referenceEl, axis = "vertical") {
    if (typeof value === "number")
        return value;
    const horizontal = axis === "horizontal";
    const viewport = typeof window === "undefined" ? 0 : horizontal ? window.innerWidth : window.innerHeight;
    if (typeof value === "string") {
        if (value.endsWith("px")) {
            const parsed = parseFloat(value);
            if (!Number.isNaN(parsed))
                return parsed;
        }
        if (value.endsWith("%")) {
            const pct = parseFloat(value);
            if (!Number.isNaN(pct)) {
                const rect = referenceEl === null || referenceEl === void 0 ? void 0 : referenceEl.getBoundingClientRect();
                const refSize = (horizontal ? rect === null || rect === void 0 ? void 0 : rect.width : rect === null || rect === void 0 ? void 0 : rect.height) || viewport;
                if (refSize > 0)
                    return (refSize * pct) / 100;
            }
        }
        if (/(?:d|s|l)?vh$/.test(value) || /(?:d|s|l)?vw$/.test(value)) {
            const units = parseFloat(value);
            const basis = /vw$/.test(value)
                ? typeof window === "undefined"
                    ? 0
                    : window.innerWidth
                : typeof window === "undefined"
                    ? 0
                    : window.innerHeight;
            if (!Number.isNaN(units) && basis > 0)
                return (basis * units) / 100;
        }
    }
    if (typeof document === "undefined" || !referenceEl)
        return 0;
    const probe = document.createElement("div");
    probe.style.position = "absolute";
    probe.style.visibility = "hidden";
    probe.style.pointerEvents = "none";
    probe.style.width = horizontal ? value : "0";
    probe.style.height = horizontal ? "0" : value;
    referenceEl.appendChild(probe);
    const rect = probe.getBoundingClientRect();
    const px = horizontal ? rect.width : rect.height;
    referenceEl.removeChild(probe);
    return px;
}
export function pickSnapTarget(height, velocity, points, travelDistance = 0) {
    if (points.length === 0)
        return height;
    if (points.length === 1)
        return points[0];
    const isUpwardFlick = velocity >= FLICK_VELOCITY_PX_MS && travelDistance >= FLICK_DISTANCE_THRESHOLD_PX;
    const isDownwardFlick = velocity <= -FLICK_VELOCITY_PX_MS && travelDistance <= -FLICK_DISTANCE_THRESHOLD_PX;
    if (isUpwardFlick) {
        const higher = points.find((p) => p > height);
        return higher !== null && higher !== void 0 ? higher : points[points.length - 1];
    }
    if (isDownwardFlick) {
        const lower = [...points].reverse().find((p) => p < height);
        return lower !== null && lower !== void 0 ? lower : points[0];
    }
    return points.reduce((best, p) => (Math.abs(p - height) < Math.abs(best - height) ? p : best), points[0]);
}
/**
 * Detent-space counterpart to {@link pickSnapTarget}: returns the index of the detent a
 * release at `size` should land on. Ties break toward the detent already selected, so
 * duplicate detent sizes never make the panel appear to jump.
 */
export function pickDetentTarget(size, velocity, detentSizes, travelDistance = 0, currentIndex = 0) {
    if (detentSizes.length === 0)
        return currentIndex;
    const isUpwardFlick = velocity >= FLICK_VELOCITY_PX_MS && travelDistance >= FLICK_DISTANCE_THRESHOLD_PX;
    const isDownwardFlick = velocity <= -FLICK_VELOCITY_PX_MS && travelDistance <= -FLICK_DISTANCE_THRESHOLD_PX;
    if (isUpwardFlick) {
        const next = detentSizes.findIndex((candidate) => candidate > size);
        return next === -1 ? detentSizes.length - 1 : next;
    }
    if (isDownwardFlick) {
        for (let index = detentSizes.length - 1; index >= 0; index -= 1) {
            if (detentSizes[index] < size)
                return index;
        }
        return 0;
    }
    let best = 0;
    for (let index = 1; index < detentSizes.length; index += 1) {
        const distance = Math.abs(detentSizes[index] - size);
        const bestDistance = Math.abs(detentSizes[best] - size);
        if (distance < bestDistance)
            best = index;
        else if (distance === bestDistance && Math.abs(index - currentIndex) < Math.abs(best - currentIndex))
            best = index;
    }
    return best;
}
/**
 * Resolves the three detents to px along the drawer's growth axis. The result is always
 * monotonic (`peek <= half <= full`) so drag, keyboard and controlled detents agree.
 */
export function resolveDetentSizes({ available, referenceEl, axis, modality, minSize, defaultSize, maxSize, autoContentSize = 0, }) {
    const fallbackMax = axis === "vertical" ? DEFAULT_MAX_HEIGHT : DEFAULT_MAX_WIDTH;
    const rawMax = resolveLength(maxSize !== null && maxSize !== void 0 ? maxSize : fallbackMax, referenceEl, axis);
    // A persistent drawer has no backdrop, so nothing needs to stay visible behind it.
    const cap = modality === "modal" && available > MIN_VISIBLE_BACKDROP_PX ? available - MIN_VISIBLE_BACKDROP_PX : available;
    const full = Math.max(0, Math.min(rawMax, cap));
    let peek;
    if (minSize !== undefined)
        peek = resolveLength(minSize, referenceEl, axis);
    else if (autoContentSize > 0)
        peek = autoContentSize;
    else if (defaultSize !== undefined)
        peek = resolveLength(defaultSize, referenceEl, axis);
    else if (modality === "persistent")
        peek = full * PERSISTENT_PEEK_FRACTION;
    else
        peek = full;
    peek = Math.max(0, Math.min(peek, full));
    let half;
    if (defaultSize !== undefined)
        half = resolveLength(defaultSize, referenceEl, axis);
    else if (modality === "persistent")
        half = full * PERSISTENT_HALF_FRACTION;
    else
        half = peek;
    half = Math.min(Math.max(half, peek), full);
    return { peek, half, full };
}
function useDockedLayout(active) {
    const [docked, setDocked] = useState(false);
    useEffect(() => {
        var _a;
        if (!active || typeof window === "undefined" || !window.matchMedia)
            return;
        const query = window.matchMedia(DOCKED_MEDIA_QUERY);
        const sync = () => setDocked(query.matches === true);
        sync();
        (_a = query.addEventListener) === null || _a === void 0 ? void 0 : _a.call(query, "change", sync);
        return () => { var _a; return (_a = query.removeEventListener) === null || _a === void 0 ? void 0 : _a.call(query, "change", sync); };
    }, [active]);
    return active && docked;
}
const COARSE_POINTER_QUERY = "(pointer: coarse)";
function useCoarsePointer(active) {
    const [coarse, setCoarse] = useState(false);
    useEffect(() => {
        var _a;
        if (!active || typeof window === "undefined" || !window.matchMedia)
            return;
        const query = window.matchMedia(COARSE_POINTER_QUERY);
        const sync = () => setCoarse(query.matches === true);
        sync();
        (_a = query.addEventListener) === null || _a === void 0 ? void 0 : _a.call(query, "change", sync);
        return () => { var _a; return (_a = query.removeEventListener) === null || _a === void 0 ? void 0 : _a.call(query, "change", sync); };
    }, [active]);
    return active && coarse;
}
export function Drawer({ open, onOpenChange, children, modality = "modal", side = "bottom", detent: controlledDetent, defaultDetent = "half", minSize, defaultSize, maxSize, minHeight, defaultHeight, maxHeight, onSnapChange, connectToBottomNav = false, draggable = false, swipeToDismiss = true, handleLabel, closeLabel, confirmDismissal, showCloseOnTouch = false, className, "aria-label": ariaLabel, "aria-labelledby": ariaLabelledBy, }) {
    var _a, _b;
    const wrapperRef = useRef(null);
    const sheetRef = useRef(null);
    const contentRef = useRef(null);
    const innerContentRef = useRef(null);
    const previouslyFocused = useRef(null);
    const dragStateRef = useRef(null);
    const isPersistent = modality === "persistent";
    // A persistent drawer's `md:` layout *is* the side panel, so it stays bottom-anchored
    // at base width instead of growing a second, divergent horizontal implementation.
    const resolvedSide = isPersistent ? "bottom" : side;
    const axis = SIDE_AXIS[resolvedSide];
    const isVertical = axis === "vertical";
    const resolvedMinSize = minSize !== null && minSize !== void 0 ? minSize : minHeight;
    const resolvedDefaultSize = defaultSize !== null && defaultSize !== void 0 ? defaultSize : defaultHeight;
    const resolvedMaxSize = maxSize !== null && maxSize !== void 0 ? maxSize : maxHeight;
    // Holds the panel in the tree for the length of the exit transition. It is raised in
    // an effect, never during render: a render-phase `setMounted(true)` inside the
    // `open !== prevOpen` guard below does NOT survive React's development double-render.
    // The second pass sees `prevOpen` already advanced, skips the guard, never re-queues
    // the update, and commits the stale `false`, so the panel sat at `open=true
    // mounted=false` for its whole life and `!open && !mounted` fired in the same commit
    // as the close — the sheet left the DOM a frame later and no exit transition could
    // run. While `open` is true the guard passes on `open` alone, so raising this a tick
    // later costs no frame.
    const [mounted, setMounted] = useState(open);
    const [entered, setEntered] = useState(false);
    const [settled, setSettled] = useState(false);
    const [sizeResolved, setSizeResolved] = useState(false);
    const [prevOpen, setPrevOpen] = useState(open);
    const [autoContentSize, setAutoContentSize] = useState(0);
    const [detentSizes, setDetentSizes] = useState({ peek: 0, half: 0, full: 0 });
    const [uncontrolledDetent, setUncontrolledDetent] = useState(defaultDetent);
    const [dragSize, setDragSize] = useState(null);
    const [confirmingDiscard, setConfirmingDiscard] = useState(false);
    // Every dismissal path (backdrop, Escape, grabber, close control, drag/flick) funnels here.
    const requestClose = () => {
        if (confirmDismissal === null || confirmDismissal === void 0 ? void 0 : confirmDismissal.isDirty)
            setConfirmingDiscard(true);
        else
            onOpenChange(false);
    };
    // Self-guarded so it converges under React's development double-render: whichever
    // pass commits, the other sees `mounted` already true and re-queues nothing. The
    // previous form raised this from inside the `open !== prevOpen` guard below, and that
    // update was dropped — the second pass found `prevOpen` already advanced, skipped the
    // guard and committed the stale `false`. The panel then lived its whole life at
    // `open=true mounted=false`, so `!open && !mounted` fired in the same commit as the
    // close and the sheet left the DOM a frame later, with no exit transition possible.
    if (open && !mounted)
        setMounted(true);
    if (open !== prevOpen) {
        setPrevOpen(open);
        if (open) {
            setSizeResolved(false);
        }
        else {
            setEntered(false);
            setSettled(false);
            setUncontrolledDetent(defaultDetent);
            // A close that lands mid-drag (a route change, a controlled `open`) would otherwise
            // leave `isDragging` true, and `transition-none` with it, for the whole exit.
            setDragSize(null);
        }
    }
    const detent = controlledDetent !== null && controlledDetent !== void 0 ? controlledDetent : uncontrolledDetent;
    const detentOrder = [detentSizes.peek, detentSizes.half, detentSizes.full];
    const detentIndex = DRAWER_DETENTS.indexOf(detent);
    const restSize = detentOrder[detentIndex];
    const docked = useDockedLayout(isPersistent);
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
    const coarsePointer = useCoarsePointer(open && swipeToDismiss);
    const swipeGestureEnabled = showSwipeGrabber && coarsePointer;
    const bottomNavHeight = useBottomNavHeight();
    useEffect(() => {
        if (!open || !sizeResolved)
            return;
        const rafId = requestAnimationFrame(() => {
            setEntered(true);
        });
        return () => cancelAnimationFrame(rafId);
    }, [open, sizeResolved]);
    useEffect(() => {
        if (!open || !entered)
            return;
        const timerId = setTimeout(() => setSettled(true), exitDurationMs());
        return () => clearTimeout(timerId);
    }, [open, entered]);
    useEffect(() => {
        if (open)
            return;
        dragStateRef.current = null;
        const timerId = setTimeout(() => setMounted(false), exitDurationMs());
        return () => clearTimeout(timerId);
    }, [open]);
    const recompute = useCallback(() => {
        const wrapper = wrapperRef.current;
        if (!wrapper)
            return;
        const rect = wrapper.getBoundingClientRect();
        const viewport = typeof window === "undefined" ? 0 : isVertical ? window.innerHeight : window.innerWidth;
        const available = (isVertical ? rect.height : rect.width) || viewport;
        setDetentSizes(resolveDetentSizes({
            available,
            referenceEl: wrapper,
            axis,
            modality,
            minSize: resolvedMinSize,
            defaultSize: resolvedDefaultSize,
            maxSize: resolvedMaxSize,
            autoContentSize,
        }));
        setSizeResolved(true);
    }, [axis, isVertical, modality, resolvedMinSize, resolvedDefaultSize, resolvedMaxSize, autoContentSize]);
    useLayoutEffect(() => {
        if (!open || resolvedMinSize !== undefined || !isVertical)
            return;
        const innerNode = innerContentRef.current;
        const contentNode = contentRef.current;
        const sheet = sheetRef.current;
        if (!innerNode || !contentNode || !sheet)
            return;
        const measure = () => {
            const grabberEl = sheet.querySelector("[data-drawer-grabber]");
            const grabberHeight = grabberEl ? (grabberEl.getBoundingClientRect().height || grabberEl.offsetHeight) : 0;
            const contentStyle = typeof window !== "undefined" ? window.getComputedStyle(contentNode) : null;
            const paddingTop = contentStyle ? parseFloat(contentStyle.paddingTop) || 0 : 0;
            const paddingBottom = contentStyle ? parseFloat(contentStyle.paddingBottom) || 0 : 0;
            const innerHeight = innerNode.getBoundingClientRect().height || innerNode.offsetHeight || innerNode.scrollHeight;
            const total = innerHeight + grabberHeight + paddingTop + paddingBottom;
            if (total > 0) {
                setAutoContentSize(total);
            }
        };
        measure();
        if (typeof ResizeObserver === "undefined")
            return;
        const observer = new ResizeObserver(measure);
        observer.observe(innerNode);
        return () => observer.disconnect();
    }, [open, resolvedMinSize, isVertical]);
    useLayoutEffect(() => {
        if (!open)
            return;
        recompute();
        window.addEventListener("resize", recompute);
        window.addEventListener("orientationchange", recompute);
        return () => {
            window.removeEventListener("resize", recompute);
            window.removeEventListener("orientationchange", recompute);
        };
    }, [open, recompute]);
    useEffect(() => {
        if (process.env.NODE_ENV === "production")
            return;
        if (open && !ariaLabel && !ariaLabelledBy) {
            console.warn("[a11y] <Drawer> has no accessible name. Pass aria-label or aria-labelledby so screen readers can announce what opened.");
        }
    }, [open, ariaLabel, ariaLabelledBy]);
    useEffect(() => {
        if (process.env.NODE_ENV === "production")
            return;
        if (open && isPersistent && side !== "bottom") {
            console.warn(`[Drawer] modality="persistent" ignores side="${side}"; a persistent drawer is a bottom sheet that docks to the inline end at md: and up.`);
        }
    }, [open, isPersistent, side]);
    // Shared reference-counted lock (`@/lib/scroll-lock`): freezes both <html>
    // and <body> with scrollbar-width compensation, held for the whole mounted
    // lifetime so the background stays frozen through the exit slide. Persistent
    // drawers never lock — the page stays interactive by design.
    // Declared before the focus effect so its cleanup lifts `inert` first — focus cannot
    // move back into a subtree that is still inert.
    useScrollLock(mounted && !isPersistent);
    useEffect(() => {
        if (!open || isPersistent)
            return;
        const wrapper = wrapperRef.current;
        const hiddenSiblings = [];
        Array.from(document.body.children).forEach((child) => {
            if (child === wrapper || !(child instanceof HTMLElement) || child.hasAttribute("inert"))
                return;
            child.setAttribute("inert", "");
            child.setAttribute("aria-hidden", "true");
            hiddenSiblings.push(child);
        });
        return () => {
            hiddenSiblings.forEach((el) => {
                el.removeAttribute("inert");
                el.removeAttribute("aria-hidden");
            });
        };
    }, [open, isPersistent]);
    useEffect(() => {
        var _a;
        if (!open)
            return;
        previouslyFocused.current = document.activeElement;
        const dialog = sheetRef.current;
        const firstFocusable = dialog === null || dialog === void 0 ? void 0 : dialog.querySelector(FOCUSABLE_SELECTOR);
        (_a = (firstFocusable !== null && firstFocusable !== void 0 ? firstFocusable : dialog)) === null || _a === void 0 ? void 0 : _a.focus({ preventScroll: true });
        return () => {
            var _a;
            (_a = previouslyFocused.current) === null || _a === void 0 ? void 0 : _a.focus({ preventScroll: true });
        };
    }, [open]);
    const commitDetent = (next) => {
        if (next === detent)
            return;
        if (controlledDetent === undefined)
            setUncontrolledDetent(next);
        setSettled(true);
        onSnapChange === null || onSnapChange === void 0 ? void 0 : onSnapChange(detentOrder[DRAWER_DETENTS.indexOf(next)], next);
    };
    const growDetent = () => {
        for (let index = detentIndex + 1; index < DRAWER_DETENTS.length; index += 1) {
            if (detentOrder[index] > restSize)
                return DRAWER_DETENTS[index];
        }
        return undefined;
    };
    const shrinkDetent = () => {
        for (let index = detentIndex - 1; index >= 0; index -= 1) {
            if (detentOrder[index] < restSize)
                return DRAWER_DETENTS[index];
        }
        return undefined;
    };
    const pointerCoord = (event) => (isVertical ? event.clientY : event.clientX);
    // `left` grows with the pointer; `bottom` and `right` grow against it.
    const growthSign = resolvedSide === "left" ? 1 : -1;
    const handlePointerDown = (event) => {
        var _a, _b;
        if (!dragEnabled)
            return;
        if (event.pointerType === "mouse" && event.button !== 0)
            return;
        (_b = (_a = event.currentTarget).setPointerCapture) === null || _b === void 0 ? void 0 : _b.call(_a, event.pointerId);
        dragStateRef.current = {
            startCoord: pointerCoord(event),
            startSize: restSize,
            samples: [{ t: performance.now(), h: restSize }],
        };
        setDragSize(restSize);
    };
    const handlePointerMove = (event) => {
        const drag = dragStateRef.current;
        if (!drag)
            return;
        const rawNext = drag.startSize + growthSign * (pointerCoord(event) - drag.startCoord);
        const next = Math.max(0, Math.min(detentSizes.full, rawNext));
        const now = performance.now();
        drag.samples.push({ t: now, h: next });
        while (drag.samples.length > 1 && now - drag.samples[0].t > VELOCITY_WINDOW_MS)
            drag.samples.shift();
        setDragSize(next);
    };
    const endDrag = (event, commit) => {
        var _a, _b, _c, _d;
        const drag = dragStateRef.current;
        dragStateRef.current = null;
        if ((_b = (_a = event.currentTarget).hasPointerCapture) === null || _b === void 0 ? void 0 : _b.call(_a, event.pointerId)) {
            (_d = (_c = event.currentTarget).releasePointerCapture) === null || _d === void 0 ? void 0 : _d.call(_c, event.pointerId);
        }
        if (!drag || !commit || detentSizes.full <= 0) {
            setDragSize(null);
            return;
        }
        const first = drag.samples[0];
        const last = drag.samples[drag.samples.length - 1];
        const dt = last.t - first.t;
        const velocity = dt > 0 ? (last.h - first.h) / dt : 0;
        const travelDistance = last.h - drag.startSize;
        const peek = detentSizes.peek;
        const isClosingFlick = velocity <= -FLICK_VELOCITY_PX_MS && travelDistance <= -FLICK_DISTANCE_THRESHOLD_PX;
        const isDraggedPastDismissThreshold = last.h < peek * DISMISS_SIZE_FRACTION || (last.h < peek && travelDistance <= -DISMISS_TRAVEL_PX);
        const isClosingFlickFromPeek = isClosingFlick && (drag.startSize <= peek + FLICK_ORIGIN_TOLERANCE_PX || last.h < peek);
        // Combined-mode dismissal rides this same release: the slider dismisses past
        // the lowest detent when dragged out or flicked, whether or not the
        // standalone swipe grabber exists. This path is unconditional in `draggable`,
        // so a draggable drawer keeps dismissing when `swipeToDismiss` is off.
        if (isDraggedPastDismissThreshold || isClosingFlickFromPeek) {
            setDragSize(null);
            requestClose();
            return;
        }
        const targetIndex = pickDetentTarget(last.h, velocity, detentOrder, travelDistance, detentIndex);
        setSettled(true);
        setDragSize(null);
        commitDetent(DRAWER_DETENTS[targetIndex]);
    };
    const handlePointerUp = (event) => endDrag(event, true);
    const handlePointerCancel = (event) => endDrag(event, false);
    // Swipe-to-dismiss tracks the same samples as a resize drag but never resizes and
    // never snaps: only a closing flick (same velocity, travel and origin tolerance)
    // dismisses, everything else settles back where it was.
    const handleSwipePointerDown = (event) => {
        var _a, _b;
        if (!swipeGestureEnabled)
            return;
        if (event.pointerType === "mouse" && event.button !== 0)
            return;
        (_b = (_a = event.currentTarget).setPointerCapture) === null || _b === void 0 ? void 0 : _b.call(_a, event.pointerId);
        dragStateRef.current = {
            startCoord: pointerCoord(event),
            startSize: restSize,
            samples: [{ t: performance.now(), h: restSize }],
        };
    };
    const handleSwipePointerMove = (event) => {
        const swipe = dragStateRef.current;
        if (!swipe)
            return;
        const rawNext = swipe.startSize + growthSign * (pointerCoord(event) - swipe.startCoord);
        const next = Math.max(0, Math.min(detentSizes.full, rawNext));
        const now = performance.now();
        swipe.samples.push({ t: now, h: next });
        while (swipe.samples.length > 1 && now - swipe.samples[0].t > VELOCITY_WINDOW_MS)
            swipe.samples.shift();
    };
    const endSwipe = (event, commit) => {
        var _a, _b, _c, _d;
        const swipe = dragStateRef.current;
        dragStateRef.current = null;
        if ((_b = (_a = event.currentTarget).hasPointerCapture) === null || _b === void 0 ? void 0 : _b.call(_a, event.pointerId)) {
            (_d = (_c = event.currentTarget).releasePointerCapture) === null || _d === void 0 ? void 0 : _d.call(_c, event.pointerId);
        }
        if (!swipe || !commit || detentSizes.full <= 0)
            return;
        const first = swipe.samples[0];
        const last = swipe.samples[swipe.samples.length - 1];
        const dt = last.t - first.t;
        const velocity = dt > 0 ? (last.h - first.h) / dt : 0;
        const travelDistance = last.h - swipe.startSize;
        const peek = detentSizes.peek;
        const isClosingFlick = velocity <= -FLICK_VELOCITY_PX_MS && travelDistance <= -FLICK_DISTANCE_THRESHOLD_PX;
        const isClosingFlickFromPeek = isClosingFlick && (swipe.startSize <= peek + FLICK_ORIGIN_TOLERANCE_PX || last.h < peek);
        if (isClosingFlickFromPeek) {
            requestClose();
        }
    };
    const handleSwipePointerUp = (event) => endSwipe(event, true);
    const handleSwipePointerCancel = (event) => endSwipe(event, false);
    const handleHandleKeyDown = (event) => {
        let target;
        if (GROW_KEYS[resolvedSide].includes(event.key))
            target = growDetent();
        else if (SHRINK_KEYS[resolvedSide].includes(event.key))
            target = shrinkDetent();
        else if (event.key === "Home")
            target = "peek";
        else if (event.key === "End")
            target = "full";
        else
            return;
        event.preventDefault();
        if (target === undefined)
            return;
        commitDetent(target);
    };
    const handleHandleClick = () => {
        var _a;
        if (dragEnabled)
            return;
        commitDetent((_a = growDetent()) !== null && _a !== void 0 ? _a : "peek");
    };
    const handleDialogKeyDown = (event) => {
        if (event.key === "Escape") {
            event.stopPropagation();
            requestClose();
            return;
        }
        if (event.key !== "Tab")
            return;
        const dialog = sheetRef.current;
        if (!dialog)
            return;
        const focusable = Array.from(dialog.querySelectorAll(FOCUSABLE_SELECTOR));
        if (focusable.length === 0)
            return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus({ preventScroll: true });
        }
        else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus({ preventScroll: true });
        }
    };
    if (!open && !mounted)
        return null;
    const isDragging = dragSize !== null;
    const renderedSize = Math.round(dragSize !== null && dragSize !== void 0 ? dragSize : restSize);
    const reportedSize = Math.round(Math.min(Math.max(renderedSize, detentSizes.peek), detentSizes.full));
    const percent = detentSizes.full > 0 ? Math.round((renderedSize / detentSizes.full) * 100) : 0;
    const valueText = `${DETENT_LABEL[detent]}, ${percent}% expanded`;
    const handleOrientation = docked || !isVertical ? "horizontal" : "vertical";
    const defaultHandleLabel = handleOrientation === "vertical" ? "Drawer height" : "Drawer width";
    const handleNode = !draggable ? null : (_jsx("button", { type: "button", role: "slider", "data-drawer-grabber": true, "aria-orientation": handleOrientation, "aria-valuemin": Math.round(detentSizes.peek), "aria-valuemax": Math.round(detentSizes.full), "aria-valuenow": reportedSize, "aria-valuetext": valueText, "aria-label": handleLabel !== null && handleLabel !== void 0 ? handleLabel : defaultHandleLabel, onKeyDown: handleHandleKeyDown, onClick: handleHandleClick, onPointerDown: handlePointerDown, onPointerMove: handlePointerMove, onPointerUp: handlePointerUp, onPointerCancel: handlePointerCancel, className: cn("focus-ring flex shrink-0 touch-none items-center justify-center", isVertical ? "min-h-11 w-full py-2" : "h-full min-w-11 px-2", dragEnabled
            ? isVertical
                ? "cursor-grab active:cursor-grabbing"
                : "cursor-col-resize"
            : "cursor-pointer", isPersistent && "px-11 md:cursor-pointer"), children: _jsx("span", { "aria-hidden": "true", className: cn("rounded-full bg-muted-foreground", isVertical ? "h-1.5 w-10" : "h-10 w-1.5") }) }, "handle"));
    const swipeNode = !showSwipeGrabber ? null : (_jsx("button", { type: "button", "data-drawer-grabber": true, "aria-label": handleLabel !== null && handleLabel !== void 0 ? handleLabel : "Dismiss drawer", onClick: requestClose, onPointerDown: handleSwipePointerDown, onPointerMove: handleSwipePointerMove, onPointerUp: handleSwipePointerUp, onPointerCancel: handleSwipePointerCancel, className: cn("focus-ring flex shrink-0 touch-none items-center justify-center", isVertical ? "min-h-11 w-full py-2" : "h-full min-w-11 px-2", "cursor-pointer", isPersistent && "px-11"), children: _jsx("span", { "aria-hidden": "true", className: cn("rounded-full bg-muted-foreground", isVertical ? "h-1.5 w-10" : "h-10 w-1.5") }) }, "swipe-grabber"));
    const contentNode = (_jsx("div", { ref: contentRef, className: cn("flex-1 overflow-y-auto px-4", isVertical ? "min-h-0" : "min-w-0 pt-4", 
        // A drawer anchored to the viewport bottom has to clear the home indicator itself,
        // or its last control sits under the iOS indicator where a tap is swallowed as a
        // system swipe. Only a bar that is actually on screen removes that duty:
        // `useBottomNavHeight` measures the rendered bar and its own `pb-safe` is inside
        // that height, so adding the inset again would double-count it. The PROP alone is
        // not enough — `connectToBottomNav` with no bar mounted measures 0, which leaves
        // the panel at the viewport bottom with the indicator still to clear.
        connectToBottomNav && bottomNavHeight > 0 ? "pb-4" : "pb-4-safe"), children: _jsx("div", { ref: innerContentRef, className: "flow-root", children: children }) }, "content"));
    // Single-affordance selection, not a mode switch: the slider carries both
    // gestures in combined mode, the grabber only when there is no slider.
    const affordanceNode = draggable ? handleNode : swipeNode;
    const panelChildren = !affordanceNode
        ? [contentNode]
        : resolvedSide === "left"
            ? [contentNode, affordanceNode]
            : [affordanceNode, contentNode];
    const closedTransformClass = resolvedSide === "bottom"
        ? isPersistent
            ? "translate-y-full md:translate-x-full md:translate-y-0"
            : "translate-y-full"
        : resolvedSide === "left"
            ? "-translate-x-full"
            : "translate-x-full";
    const openTransformClass = isPersistent ? "translate-y-0 md:translate-x-0" : isVertical ? "translate-y-0" : "translate-x-0";
    // `translate`, not `transform`: Tailwind v4's `translate-*` utilities write the
    // `translate` property, so a list naming `transform` leaves the slide untransitioned.
    // It must stay in the list across the settled boundary — the exit flips `settled` back
    // to false and the closed transform in the same commit, and a property that only enters
    // the list in that commit has no transition to start from.
    const settledTransitionClass = isPersistent
        ? "transition-[height,opacity,translate] md:transition-[width,opacity,translate]"
        : isVertical
            ? "transition-[height,opacity,translate]"
            : "transition-[width,opacity,translate]";
    const shapeClass = isPersistent
        ? cn("mx-auto w-full rounded-t-2xl border-t md:mx-0 md:h-full! md:rounded-none md:rounded-s-2xl md:border-s md:border-t-0", DOCKED_WIDTH_CLASS[detent])
        : resolvedSide === "bottom"
            ? "mx-auto w-full rounded-t-2xl border-t md:max-w-md md:rounded-2xl"
            : resolvedSide === "left"
                ? "h-full max-w-full rounded-r-2xl border-r"
                : "h-full max-w-full rounded-l-2xl border-l";
    const discardPrompt = confirmDismissal ? (_jsx(Modal, { open: confirmingDiscard, onClose: () => setConfirmingDiscard(false), role: "alertdialog", size: "sm", title: confirmDismissal.title, description: confirmDismissal.message, footer: _jsxs(_Fragment, { children: [_jsx(Button, { variant: "outline", size: "sm", onClick: () => setConfirmingDiscard(false), children: (_a = confirmDismissal.keepLabel) !== null && _a !== void 0 ? _a : "Keep editing" }), _jsx(Button, { variant: "danger", size: "sm", onClick: () => {
                        setConfirmingDiscard(false);
                        onOpenChange(false);
                    }, children: (_b = confirmDismissal.discardLabel) !== null && _b !== void 0 ? _b : "Discard" })] }) })) : null;
    return createPortal(_jsxs("div", { ref: wrapperRef, className: cn("fixed inset-x-0 top-0 z-50 flex", isVertical ? "flex-col justify-end" : "flex-row items-stretch", resolvedSide === "left" && "justify-start", resolvedSide === "right" && "justify-end", isPersistent && "pointer-events-none md:flex-row md:items-stretch md:justify-end", !open && "pointer-events-none"), style: { bottom: connectToBottomNav ? bottomNavHeight : 0 }, "aria-hidden": !open ? "true" : undefined, children: [!isPersistent && (_jsx("div", { className: cn("absolute inset-0 bg-black/50", entered ? "opacity-100" : "opacity-0", isDragging ? "transition-none" : "motion-scrim motion-reduce:transition-none"), onClick: requestClose, "aria-hidden": "true" })), _jsxs("div", { ref: sheetRef, role: "dialog", "aria-modal": isPersistent ? undefined : "true", "aria-label": ariaLabel, "aria-labelledby": ariaLabelledBy, tabIndex: -1, onKeyDown: isPersistent ? undefined : handleDialogKeyDown, style: sizeResolved
                    ? isVertical
                        ? draggable
                            ? { height: `${renderedSize}px` }
                            : { maxHeight: `${Math.round(detentSizes.full)}px` }
                        : draggable
                            ? { width: `${renderedSize}px` }
                            : { width: `${Math.round(detentSizes.full)}px` }
                    : undefined, className: cn("relative z-10 flex overflow-hidden border-border bg-surface shadow-xl", isVertical ? "flex-col" : "flex-row", shapeClass, isPersistent && "pointer-events-auto", entered ? openTransformClass : closedTransformClass, entered ? "opacity-100" : "opacity-0", isDragging && "transition-none", !isDragging &&
                    !settled &&
                    (entered
                        ? "motion-sheet-in motion-reduce:transition-none"
                        : "motion-sheet-out motion-reduce:transition-none"), !isDragging && settled && `${settledTransitionClass} motion-spatial ease-sheet motion-reduce:transition-none`, className), children: [panelChildren, isPersistent && (_jsxs(_Fragment, { children: [_jsx("button", { type: "button", onClick: requestClose, "aria-label": closeLabel !== null && closeLabel !== void 0 ? closeLabel : "Close", className: cn("focus-ring absolute end-1 top-0 flex size-11 items-center justify-center rounded-full text-muted-foreground hover:text-foreground", !showCloseOnTouch && "touch-concealed"), children: _jsx(X, { className: "size-5" }) }), draggable && (_jsx("span", { role: "status", "aria-live": "polite", className: "sr-only", children: valueText }))] }))] }), discardPrompt] }), document.body);
}
