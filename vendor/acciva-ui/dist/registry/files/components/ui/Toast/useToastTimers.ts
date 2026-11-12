import { useCallback, useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import { EXIT_DURATION_MS } from "@/components/ui/Toast/constants";
import { removeToast } from "@/components/ui/Toast/toastState";
import type { TimerEntry, ToastRecord } from "@/components/ui/Toast/types";

export function useToastTimers(
  toasts: ToastRecord[],
  setToasts: Dispatch<SetStateAction<ToastRecord[]>>,
  maxVisible: number,
) {
  const timerMapRef = useRef(new Map<string, TimerEntry>());
  const removalTimeoutsRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const clearToastTimer = useCallback((id: string) => {
    const entry = timerMapRef.current.get(id);
    if (!entry) return;
    if (entry.timeoutId !== null) clearTimeout(entry.timeoutId);
    timerMapRef.current.delete(id);
  }, []);

  const requestDismiss = useCallback(
    (id: string) => {
      clearToastTimer(id);
      setToasts((prev) => prev.map((t) => (t.id === id && t.status !== "leaving" ? { ...t, status: "leaving" } : t)));

      const timeoutId = setTimeout(() => {
        removalTimeoutsRef.current.delete(id);
        setToasts((prev) => removeToast(prev, id, maxVisible));
      }, EXIT_DURATION_MS);
      removalTimeoutsRef.current.set(id, timeoutId);
    },
    [maxVisible, clearToastTimer, setToasts],
  );

  const scheduleToastTimer = useCallback(
    (id: string, duration: number) => {
      if (!Number.isFinite(duration)) {
        timerMapRef.current.set(id, { timeoutId: null, startedAt: Date.now(), remaining: duration });
        return;
      }
      const timeoutId = setTimeout(() => requestDismiss(id), duration);
      timerMapRef.current.set(id, { timeoutId, startedAt: Date.now(), remaining: duration });
    },
    [requestDismiss],
  );

  const pauseToastTimer = useCallback((id: string) => {
    const entry = timerMapRef.current.get(id);
    if (!entry || entry.timeoutId === null) return;
    clearTimeout(entry.timeoutId);
    const remaining = Math.max(0, entry.remaining - (Date.now() - entry.startedAt));
    timerMapRef.current.set(id, { timeoutId: null, startedAt: Date.now(), remaining });
  }, []);

  const resumeToastTimer = useCallback(
    (id: string) => {
      const entry = timerMapRef.current.get(id);
      if (!entry || entry.timeoutId !== null || !Number.isFinite(entry.remaining)) return;
      const timeoutId = setTimeout(() => requestDismiss(id), entry.remaining);
      timerMapRef.current.set(id, { timeoutId, startedAt: Date.now(), remaining: entry.remaining });
    },
    [requestDismiss],
  );

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
        if (entry.timeoutId !== null) clearTimeout(entry.timeoutId);
      });
      removals.forEach((timeoutId) => clearTimeout(timeoutId));
    };
  }, []);

  const clearAllTimers = useCallback(() => {
    timerMapRef.current.forEach((entry) => {
      if (entry.timeoutId !== null) clearTimeout(entry.timeoutId);
    });
    timerMapRef.current.clear();
    removalTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
    removalTimeoutsRef.current.clear();
  }, []);

  return { requestDismiss, pauseToastTimer, resumeToastTimer, clearAllTimers };
}
