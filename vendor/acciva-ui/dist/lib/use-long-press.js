"use client";
import { useCallback, useEffect, useRef } from "react";
/** Hold time before a touch/pen press counts as a long-press (mirrors the 0.5s Apple duration). */
export const LONG_PRESS_MS = 500;
/** Finger travel in px that cancels the press — it became a scroll or drag. */
const LONG_PRESS_SLOP = 10;
/** How long after release the synthetic click of a fired long-press is still swallowed. */
const CLICK_GUARD_MS = 400;
/**
 * Touch/pen long-press (WCAG 2.2 SC 2.5.1: never the only path; SC 2.5.2: release without a
 * click once it fired). Mouse and keyboard never arm it. The handlers are spread onto the
 * trigger; `consumeClick()` returns true once to drop the click that follows a fired press.
 */
export function useLongPress(enabled, onLongPress, onRelease) {
    const timer = useRef(null);
    const guard = useRef(null);
    const press = useRef(null);
    const fired = useRef(false);
    const swallow = useRef(false);
    const disarm = useCallback(() => {
        if (timer.current)
            clearTimeout(timer.current);
        timer.current = null;
        // iOS callout is suppressed only while a press is armed, never on the idle trigger.
        if (press.current)
            press.current.target.style.removeProperty("-webkit-touch-callout");
        press.current = null;
    }, []);
    useEffect(() => () => {
        if (timer.current)
            clearTimeout(timer.current);
        if (guard.current)
            clearTimeout(guard.current);
    }, []);
    const end = useCallback(() => {
        disarm();
        if (!fired.current)
            return;
        fired.current = false;
        swallow.current = true;
        if (guard.current)
            clearTimeout(guard.current);
        guard.current = setTimeout(() => {
            swallow.current = false;
        }, CLICK_GUARD_MS);
        onRelease?.();
    }, [disarm, onRelease]);
    return {
        onPointerDown: (e) => {
            if (!enabled || e.pointerType === "mouse")
                return;
            disarm();
            const target = e.currentTarget;
            target.style.setProperty("-webkit-touch-callout", "none");
            press.current = { x: e.clientX, y: e.clientY, target };
            timer.current = setTimeout(() => {
                timer.current = null;
                fired.current = true;
                if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function")
                    navigator.vibrate(10);
                onLongPress();
            }, LONG_PRESS_MS);
        },
        onPointerMove: (e) => {
            const p = press.current;
            if (!p || fired.current)
                return;
            if (Math.hypot(e.clientX - p.x, e.clientY - p.y) > LONG_PRESS_SLOP)
                disarm();
        },
        onPointerUp: end,
        onPointerCancel: end,
        onContextMenu: (e) => {
            if (press.current || fired.current || swallow.current)
                e.preventDefault();
        },
        consumeClick: () => {
            const was = swallow.current;
            swallow.current = false;
            return was;
        },
    };
}
