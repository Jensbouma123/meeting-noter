"use client";
import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "../../components/ui/Button.js";
import { cn } from "../../lib/utils.js";
import { useScrollLock } from "../../lib/scroll-lock.js";
const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-lg",
    lg: "max-w-2xl",
};
const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
/* Covers the longest dialog transition (the coarse-pointer --motion-spatial). */
const DIALOG_EXIT_MS = 260;
function prefersReducedMotion() {
    var _a;
    return (typeof window !== "undefined" &&
        ((_a = window.matchMedia) === null || _a === void 0 ? void 0 : _a.call(window, "(prefers-reduced-motion: reduce)").matches) === true);
}
export function Modal({ open, onClose, title, description, children, footer, size = "md", confirmDismissal, role = "dialog", className, "aria-label": ariaLabel, }) {
    var _a, _b;
    const containerRef = useRef(null);
    const dialogRef = useRef(null);
    const previouslyFocused = useRef(null);
    const titleId = useId();
    const descriptionId = useId();
    const [mounted, setMounted] = useState(open);
    const [visible, setVisible] = useState(false);
    const [prevOpen, setPrevOpen] = useState(open);
    const [confirmingDiscard, setConfirmingDiscard] = useState(false);
    const requestClose = () => {
        if (confirmDismissal === null || confirmDismissal === void 0 ? void 0 : confirmDismissal.isDirty)
            setConfirmingDiscard(true);
        else
            onClose();
    };
    if (open !== prevOpen) {
        setPrevOpen(open);
        if (open) {
            setMounted(true);
        }
        else {
            setVisible(false);
            if (prefersReducedMotion()) {
                setMounted(false);
            }
        }
    }
    useEffect(() => {
        if (!open || !mounted)
            return;
        const rafId = requestAnimationFrame(() => setVisible(true));
        return () => cancelAnimationFrame(rafId);
    }, [open, mounted]);
    useEffect(() => {
        if (open || !mounted)
            return;
        if (prefersReducedMotion())
            return;
        const timerId = setTimeout(() => setMounted(false), DIALOG_EXIT_MS);
        return () => clearTimeout(timerId);
    }, [open, mounted]);
    // Reference-counted in `@/lib/scroll-lock`: locks both <html> and <body>
    // (the viewport scrollbar is owned by <html> — locking <body> alone leaves
    // the page scrollable with the scrollbar still visible while the old
    // per-component padding compensation narrowed the background, i.e. the
    // leftward shift). Held for the whole mounted lifetime so the background
    // stays frozen through the exit transition, and safe to nest (Modal over
    // Drawer, ConfirmDialog via Modal).
    useScrollLock(mounted);
    useEffect(() => {
        var _a;
        // Keyed on `mounted` as well as `open`: the portal only exists a render
        // after `open` flips (the enter animation mounts it), so a focus pass
        // keyed on `open` alone runs while `dialogRef` is still null and never
        // re-runs (WCAG 2.2 SC 2.4.3).
        if (!open || !mounted)
            return;
        previouslyFocused.current = document.activeElement;
        const dialog = dialogRef.current;
        const firstFocusable = dialog === null || dialog === void 0 ? void 0 : dialog.querySelector(FOCUSABLE_SELECTOR);
        // `preventScroll` on every programmatic focus here: WebKit otherwise scrolls
        // the document to the target (e.g. a trigger in a sticky sidebar on return).
        (_a = (firstFocusable !== null && firstFocusable !== void 0 ? firstFocusable : dialog)) === null || _a === void 0 ? void 0 : _a.focus({ preventScroll: true });
        const wrapper = containerRef.current;
        const hiddenSiblings = [];
        if (wrapper) {
            Array.from(document.body.children).forEach((child) => {
                if (child === wrapper || !(child instanceof HTMLElement) || child.hasAttribute("inert"))
                    return;
                child.setAttribute("inert", "");
                hiddenSiblings.push(child);
            });
        }
        return () => {
            var _a;
            hiddenSiblings.forEach((el) => {
                el.removeAttribute("inert");
            });
            (_a = previouslyFocused.current) === null || _a === void 0 ? void 0 : _a.focus({ preventScroll: true });
        };
    }, [open, mounted]);
    if (!mounted)
        return null;
    const handleKeyDown = (event) => {
        if (event.key === "Escape") {
            event.stopPropagation();
            requestClose();
            return;
        }
        if (event.key !== "Tab")
            return;
        const dialog = dialogRef.current;
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
    const discardPrompt = confirmDismissal ? (_jsx(Modal, { open: confirmingDiscard, onClose: () => setConfirmingDiscard(false), role: "alertdialog", size: "sm", title: confirmDismissal.title, description: confirmDismissal.message, footer: _jsxs(_Fragment, { children: [_jsx(Button, { variant: "outline", size: "sm", onClick: () => setConfirmingDiscard(false), children: (_a = confirmDismissal.keepLabel) !== null && _a !== void 0 ? _a : "Keep editing" }), _jsx(Button, { variant: "danger", size: "sm", onClick: () => {
                        setConfirmingDiscard(false);
                        onClose();
                    }, children: (_b = confirmDismissal.discardLabel) !== null && _b !== void 0 ? _b : "Discard" })] }) })) : null;
    return createPortal(_jsxs("div", { ref: containerRef, className: "fixed inset-0 z-50 flex items-center justify-center p-4", children: [_jsx("div", { className: "absolute inset-0 bg-black/50 dialog-overlay motion-feedback motion-reduce:transition-none", "data-open": visible, onClick: requestClose, "aria-hidden": "true" }), _jsxs("div", { ref: dialogRef, role: role, "aria-modal": "true", "aria-label": ariaLabel, "aria-labelledby": ariaLabel ? undefined : titleId, "aria-describedby": description ? descriptionId : undefined, tabIndex: -1, onKeyDown: handleKeyDown, "data-open": visible, className: cn("relative z-10 flex w-full flex-col gap-4 rounded-xl border border-border bg-surface p-6 shadow-xl dialog-panel motion-spatial ease-emphasized motion-reduce:transition-none", sizeClasses[size], className), children: [_jsxs("div", { className: "flex items-start justify-between gap-4", children: [_jsxs("div", { children: [_jsx("h2", { id: titleId, className: "text-lg font-semibold text-foreground", children: title }), description ? (_jsx("p", { id: descriptionId, className: "mt-1 text-sm text-muted-foreground", children: description })) : null] }), _jsx("button", { type: "button", onClick: requestClose, "aria-label": "Close dialog", className: "focus-ring shrink-0 rounded-md p-1 text-muted-foreground transition-colors motion-feedback hover:bg-elevation-3 hover:text-foreground active:bg-elevation-4 active:text-foreground active:scale-[0.99]", children: _jsx(X, { className: "size-5" }) })] }), children ? _jsx("div", { className: "text-sm text-foreground", children: children }) : null, footer ? _jsx("div", { className: "flex items-center justify-end gap-2 pt-2", children: footer }) : null] }), discardPrompt] }), document.body);
}
