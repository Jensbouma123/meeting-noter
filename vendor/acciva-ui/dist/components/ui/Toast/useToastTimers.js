import { useCallback, useEffect, useRef } from "react";
import { EXIT_DURATION_MS } from "./constants.js";
import { removeToast } from "./toastState.js";
export function useToastTimers(toasts, setToasts, maxVisible) {
    const timerMapRef = useRef(new Map());
    const removalTimeoutsRef = useRef(new Map());
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
        setToasts((prev) => prev.map((t) => (t.id === id && t.status !== "leaving" ? { ...t, status: "leaving" } : t)));
        const timeoutId = setTimeout(() => {
            removalTimeoutsRef.current.delete(id);
            setToasts((prev) => removeToast(prev, id, maxVisible));
        }, EXIT_DURATION_MS);
        removalTimeoutsRef.current.set(id, timeoutId);
    }, [maxVisible, clearToastTimer, setToasts]);
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
    const clearAllTimers = useCallback(() => {
        timerMapRef.current.forEach((entry) => {
            if (entry.timeoutId !== null)
                clearTimeout(entry.timeoutId);
        });
        timerMapRef.current.clear();
        removalTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
        removalTimeoutsRef.current.clear();
    }, []);
    return { requestDismiss, pauseToastTimer, resumeToastTimer, clearAllTimers };
}
