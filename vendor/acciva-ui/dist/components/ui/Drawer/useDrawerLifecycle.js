import { useEffect, useState } from "react";
import { exitDurationMs } from "./exitDuration.js";
/**
 * Returns `[mounted, entered, settled, sizeResolved, setSettled, setSizeResolved,
 * uncontrolledDetent, setUncontrolledDetent, dragSize, setDragSize]`.
 * Owns the open/close state machine and everything that resets when the drawer closes.
 * The render-phase updates below run before the first commit, so the panel never paints
 * a stale frame of the previous open state.
 */
export function useDrawerLifecycle(open, defaultDetent, dragStateRef) {
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
    const [uncontrolledDetent, setUncontrolledDetent] = useState(defaultDetent);
    const [dragSize, setDragSize] = useState(null);
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
    }, [open, dragStateRef]);
    return [
        mounted,
        entered,
        settled,
        sizeResolved,
        setSettled,
        setSizeResolved,
        uncontrolledDetent,
        setUncontrolledDetent,
        dragSize,
        setDragSize,
    ];
}
