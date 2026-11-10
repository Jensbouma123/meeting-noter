"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, } from "react";
import { createPortal } from "react-dom";
import { useBottomNavHeight } from "../../components/ui/BottomNav.js";
import { Button } from "../../components/ui/Button.js";
import { cn } from "../../lib/utils.js";
import { VARIANT_ACCENT_BORDER_LEFT, VARIANT_ACCENT_TEXT, VARIANT_ICON, VARIANT_POLITENESS, } from "../../components/ui/variant-tokens.js";
const emptySubscribe = () => () => { };
const ToastContext = createContext(null);
const DEFAULT_DURATION_MS = 5000;
const DEFAULT_MAX_VISIBLE = 3;
const DEFAULT_POSITION = "bottom-center";
const DEFAULT_HOTKEY = "F6";
// Matches globals.css's acciva-fade-in keyframe duration, so the exit fade and the
// delayed removal-from-array stay in lockstep.
const EXIT_DURATION_MS = 150;
const ALL_POSITIONS = [
    "top-left",
    "top-center",
    "top-right",
    "bottom-left",
    "bottom-center",
    "bottom-right",
];
const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
const POSITION_HORIZONTAL_CLASS = {
    "top-left": "sm:left-4 sm:right-auto items-stretch sm:items-start",
    "top-center": "sm:left-1/2 sm:right-auto sm:-translate-x-1/2 items-stretch sm:items-center",
    "top-right": "sm:right-4 sm:left-auto items-stretch sm:items-end",
    "bottom-left": "sm:left-4 sm:right-auto items-stretch sm:items-start",
    "bottom-center": "sm:left-1/2 sm:right-auto sm:-translate-x-1/2 items-stretch sm:items-center",
    "bottom-right": "sm:right-4 sm:left-auto items-stretch sm:items-end",
};
function isTopPosition(position) {
    return position.startsWith("top");
}
let toastIdCounter = 0;
function generateToastId() {
    toastIdCounter += 1;
    return `toast-${toastIdCounter}`;
}
export function ToastProvider({ children, position = DEFAULT_POSITION, maxVisible = DEFAULT_MAX_VISIBLE, hotkey = DEFAULT_HOTKEY, }) {
    const [toasts, setToasts] = useState([]);
    const timerMapRef = useRef(new Map());
    const removalTimeoutsRef = useRef(new Map());
    const rootRef = useRef(null);
    const previouslyFocusedRef = useRef(null);
    const bottomNavHeight = useBottomNavHeight();
    const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
    const clearToastTimer = useCallback((id) => {
        const entry = timerMapRef.current.get(id);
        if (!entry)
            return;
        if (entry.timeoutId !== null)
            clearTimeout(entry.timeoutId);
        timerMapRef.current.delete(id);
    }, []);
    const requestDismiss = useCallback((id) => {
        clearToastTimer(id);
        setToasts((prev) => prev.map((t) => (t.id === id && t.status !== "leaving" ? Object.assign(Object.assign({}, t), { status: "leaving" }) : t)));
        const timeoutId = setTimeout(() => {
            removalTimeoutsRef.current.delete(id);
            setToasts((prev) => {
                const removed = prev.find((t) => t.id === id);
                const rest = prev.filter((t) => t.id !== id);
                if (!removed)
                    return rest;
                const samePosition = rest.filter((t) => t.position === removed.position);
                const visibleCount = samePosition.filter((t) => t.status === "visible").length;
                if (visibleCount >= maxVisible)
                    return rest;
                // Queue, not collapse: an overflowing toast (possibly one carrying an action or
                // an error the user must act on) is never hidden behind a "+N more" summary — it
                // waits its turn and is guaranteed to be shown once room frees up.
                const nextQueued = samePosition
                    .filter((t) => t.status === "queued")
                    .sort((a, b) => a.createdAt - b.createdAt)[0];
                if (!nextQueued)
                    return rest;
                return rest.map((t) => (t.id === nextQueued.id ? Object.assign(Object.assign({}, t), { status: "visible" }) : t));
            });
        }, EXIT_DURATION_MS);
        removalTimeoutsRef.current.set(id, timeoutId);
    }, [maxVisible, clearToastTimer]);
    const scheduleToastTimer = useCallback((id, duration) => {
        if (!Number.isFinite(duration)) {
            timerMapRef.current.set(id, { timeoutId: null, startedAt: Date.now(), remaining: duration });
            return;
        }
        const timeoutId = setTimeout(() => requestDismiss(id), duration);
        timerMapRef.current.set(id, { timeoutId, startedAt: Date.now(), remaining: duration });
    }, [requestDismiss]);
    const pauseToastTimer = useCallback((id) => {
        const entry = timerMapRef.current.get(id);
        if (!entry || entry.timeoutId === null)
            return;
        clearTimeout(entry.timeoutId);
        const remaining = Math.max(0, entry.remaining - (Date.now() - entry.startedAt));
        timerMapRef.current.set(id, { timeoutId: null, startedAt: Date.now(), remaining });
    }, []);
    const resumeToastTimer = useCallback((id) => {
        const entry = timerMapRef.current.get(id);
        if (!entry || entry.timeoutId !== null || !Number.isFinite(entry.remaining))
            return;
        const timeoutId = setTimeout(() => requestDismiss(id), entry.remaining);
        timerMapRef.current.set(id, { timeoutId, startedAt: Date.now(), remaining: entry.remaining });
    }, [requestDismiss]);
    // Starts the countdown the moment a toast (newly added, or promoted from the queue)
    // actually becomes visible — never while it's still queued and unseen.
    useEffect(() => {
        toasts.forEach((t) => {
            if (t.status === "visible" && !timerMapRef.current.has(t.id)) {
                scheduleToastTimer(t.id, t.duration);
            }
        });
    }, [toasts, scheduleToastTimer]);
    useEffect(() => {
        const timers = timerMapRef.current;
        const removals = removalTimeoutsRef.current;
        return () => {
            timers.forEach((entry) => {
                if (entry.timeoutId !== null)
                    clearTimeout(entry.timeoutId);
            });
            removals.forEach((timeoutId) => clearTimeout(timeoutId));
        };
    }, []);
    const addToast = useCallback((variant, options) => {
        var _a, _b, _c;
        const id = generateToastId();
        const toastPosition = (_a = options.position) !== null && _a !== void 0 ? _a : position;
        const dismissible = (_b = options.dismissible) !== null && _b !== void 0 ? _b : true;
        const duration = (_c = options.duration) !== null && _c !== void 0 ? _c : (variant === "danger" || options.action ? Infinity : DEFAULT_DURATION_MS);
        const createdAt = Date.now();
        if (process.env.NODE_ENV !== "production" && !dismissible && !Number.isFinite(duration) && !options.action) {
            console.warn("[Toast] a non-dismissible toast with duration: Infinity and no action can never be closed by the user.");
        }
        setToasts((prev) => {
            const visibleCount = prev.filter((t) => t.position === toastPosition && t.status === "visible").length;
            const status = visibleCount < maxVisible ? "visible" : "queued";
            const record = {
                id,
                variant,
                title: options.title,
                description: options.description,
                action: options.action,
                dismissible,
                position: toastPosition,
                duration,
                createdAt,
                status,
            };
            return [...prev, record];
        });
        return id;
    }, [position, maxVisible]);
    const dismissAll = useCallback(() => {
        timerMapRef.current.forEach((entry) => {
            if (entry.timeoutId !== null)
                clearTimeout(entry.timeoutId);
        });
        timerMapRef.current.clear();
        removalTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
        removalTimeoutsRef.current.clear();
        setToasts([]);
    }, []);
    const toastFn = useMemo(() => {
        const call = (options) => { var _a; return addToast((_a = options.variant) !== null && _a !== void 0 ? _a : "info", options); };
        return Object.assign(call, {
            success: (message, opts) => addToast("success", Object.assign(Object.assign({}, opts), { title: message })),
            danger: (message, opts) => addToast("danger", Object.assign(Object.assign({}, opts), { title: message })),
            warning: (message, opts) => addToast("warning", Object.assign(Object.assign({}, opts), { title: message })),
            info: (message, opts) => addToast("info", Object.assign(Object.assign({}, opts), { title: message })),
        });
    }, [addToast]);
    const contextValue = useMemo(() => ({ toast: toastFn, dismiss: requestDismiss, dismissAll }), [toastFn, requestDismiss, dismissAll]);
    useEffect(() => {
        function handleHotkey(event) {
            if (event.key !== hotkey)
                return;
            const root = rootRef.current;
            if (!root)
                return;
            const focusable = root.querySelector(FOCUSABLE_SELECTOR);
            if (!focusable)
                return;
            event.preventDefault();
            previouslyFocusedRef.current = document.activeElement;
            focusable.focus({ preventScroll: true });
        }
        document.addEventListener("keydown", handleHotkey);
        return () => document.removeEventListener("keydown", handleHotkey);
    }, [hotkey]);
    const handleRegionKeyDown = (event) => {
        var _a;
        if (event.key !== "Escape")
            return;
        event.stopPropagation();
        (_a = previouslyFocusedRef.current) === null || _a === void 0 ? void 0 : _a.focus({ preventScroll: true });
        previouslyFocusedRef.current = null;
    };
    return (_jsxs(ToastContext.Provider, { value: contextValue, children: [children, mounted
                ? createPortal(_jsx("div", { ref: rootRef, onKeyDown: handleRegionKeyDown, children: ALL_POSITIONS.map((pos) => {
                        const atPosition = toasts.filter((t) => t.position === pos && t.status !== "queued");
                        const ordered = isTopPosition(pos) ? [...atPosition].reverse() : atPosition;
                        const assertiveToasts = ordered.filter((t) => VARIANT_POLITENESS[t.variant] === "assertive");
                        const politeToasts = ordered.filter((t) => VARIANT_POLITENESS[t.variant] === "polite");
                        const regionStyle = isTopPosition(pos)
                            ? { top: "calc(env(safe-area-inset-top) + 1rem)" }
                            : {
                                bottom: `calc(env(safe-area-inset-bottom) + ${bottomNavHeight > 0 ? `${bottomNavHeight}px + ` : ""}1rem)`,
                            };
                        return (_jsxs("div", { className: cn("fixed inset-x-4 z-50 flex flex-col gap-2 pointer-events-none sm:inset-x-auto sm:w-full sm:max-w-sm", POSITION_HORIZONTAL_CLASS[pos]), style: regionStyle, children: [_jsx("div", { role: "alert", "aria-live": "assertive", className: "flex flex-col gap-2", children: assertiveToasts.map((t) => (_jsx(ToastCard, { toast: t, onDismiss: requestDismiss, onPause: pauseToastTimer, onResume: resumeToastTimer }, t.id))) }), _jsx("div", { role: "status", "aria-live": "polite", className: "flex flex-col gap-2", children: politeToasts.map((t) => (_jsx(ToastCard, { toast: t, onDismiss: requestDismiss, onPause: pauseToastTimer, onResume: resumeToastTimer }, t.id))) })] }, pos));
                    }) }), document.body)
                : null] }));
}
function ToastCard({ toast, onDismiss, onPause, onResume }) {
    const engagedRef = useRef({ hover: false, focus: false });
    function setEngagement(next) {
        const was = engagedRef.current.hover || engagedRef.current.focus;
        engagedRef.current = Object.assign(Object.assign({}, engagedRef.current), next);
        const is = engagedRef.current.hover || engagedRef.current.focus;
        if (was === is)
            return;
        if (is)
            onPause(toast.id);
        else
            onResume(toast.id);
    }
    const Icon = VARIANT_ICON[toast.variant];
    const { action } = toast;
    const leaving = toast.status === "leaving";
    return (_jsxs("div", { className: cn("pointer-events-auto relative flex w-full items-start gap-3 rounded-xl border border-border border-l-4 bg-surface p-4 shadow-lg", VARIANT_ACCENT_BORDER_LEFT[toast.variant], "motion-safe:transition-all motion-safe:motion-feedback motion-safe:animate-fade-in", leaving ? "opacity-0 motion-safe:translate-y-1" : "opacity-100 translate-y-0"), onMouseEnter: () => setEngagement({ hover: true }), onMouseLeave: () => setEngagement({ hover: false }), onFocus: () => setEngagement({ focus: true }), onBlur: (event) => {
            if (event.currentTarget.contains(event.relatedTarget))
                return;
            setEngagement({ focus: false });
        }, children: [_jsx(Icon, { "aria-hidden": "true", className: cn("mt-0.5 size-5 shrink-0", VARIANT_ACCENT_TEXT[toast.variant]) }), _jsxs("div", { className: "min-w-0 flex-1", children: [toast.title ? _jsx("p", { className: "text-sm font-semibold text-foreground", children: toast.title }) : null, toast.description ? (_jsx("p", { className: cn("text-sm text-muted-foreground", toast.title ? "mt-0.5" : undefined), children: toast.description })) : null, action ? (_jsx("div", { className: "mt-2", children: _jsx(Button, { size: "sm", variant: "outline", onClick: () => {
                                action.onClick();
                                onDismiss(toast.id);
                            }, children: action.label }) })) : null] }), toast.dismissible ? (_jsx(Button, { iconOnly: true, tooltip: "Dismiss notification", variant: "ghost", size: "xxs", className: "-mt-1 -mr-1 shrink-0", onClick: () => onDismiss(toast.id), children: _jsx(X, {}) })) : null] }));
}
export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx)
        throw new Error("useToast must be used within a ToastProvider");
    return ctx;
}
