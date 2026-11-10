"use client";
import { useEffect } from "react";
let lockCount = 0;
let originalBodyOverflow = "";
let originalBodyPaddingRight = "";
let originalHtmlOverflow = "";
export function getScrollbarWidth() {
    if (typeof window === "undefined" || typeof document === "undefined")
        return 0;
    return window.innerWidth - document.documentElement.clientWidth;
}
/**
 * Reference-counted scroll lock for modal dialogs (Modal, Drawer modal,
 * SettingsSheet, ConfirmDialog via Modal).
 *
 * Why both html and body: the viewport scrollbar is owned by
 * `document.documentElement` on most desktop browsers. Locking only
 * `document.body` leaves the page behind the dialog scrollable and keeps the
 * scrollbar visible while the old code still added `paddingRight`
 * compensation — the background then narrowed and visibly shifted left.
 * Locking both elements removes the scrollbar and freezes the page behind
 * the dialog (WCAG 2.2 SC 2.4.3 / 1.4.10 background-scroll behaviour).
 *
 * Nesting: the first locker records the original styles and applies the
 * compensation; subsequent lockers only bump the counter. The last unlock
 * restores. Unlock is idempotent.
 */
export function lockScroll() {
    if (typeof window === "undefined" || typeof document === "undefined") {
        return () => { };
    }
    if (lockCount === 0) {
        originalBodyOverflow = document.body.style.overflow;
        originalBodyPaddingRight = document.body.style.paddingRight;
        originalHtmlOverflow = document.documentElement.style.overflow;
        const scrollbarWidth = getScrollbarWidth();
        document.body.style.overflow = "hidden";
        document.documentElement.style.overflow = "hidden";
        if (scrollbarWidth > 0) {
            const existingPaddingRight = parseFloat(window.getComputedStyle(document.body).paddingRight) || 0;
            document.body.style.paddingRight = `${existingPaddingRight + scrollbarWidth}px`;
        }
    }
    lockCount += 1;
    let released = false;
    return () => {
        if (released)
            return;
        released = true;
        lockCount = Math.max(0, lockCount - 1);
        if (lockCount === 0 && typeof document !== "undefined") {
            document.body.style.overflow = originalBodyOverflow;
            document.body.style.paddingRight = originalBodyPaddingRight;
            document.documentElement.style.overflow = originalHtmlOverflow;
        }
    };
}
export function useScrollLock(active = true) {
    useEffect(() => {
        if (!active)
            return;
        const unlock = lockScroll();
        return unlock;
    }, [active]);
}
export function __resetScrollLockForTests() {
    lockCount = 0;
    originalBodyOverflow = "";
    originalBodyPaddingRight = "";
    originalHtmlOverflow = "";
}
