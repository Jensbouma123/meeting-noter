import { useEffect, useRef, useState } from "react";
export function useSidebarReorder({ items, onReorder, railRefs, drawerRefs, }) {
    // Alt+Arrow moves the row, which React re-inserts; refocus the moved link after commit.
    const pendingFocus = useRef(null);
    // Polite announcement of the last move (SC 4.1.3); keyed by item count so it resets
    // when the list itself changes shape, not on every reorder.
    const [reorderNote, setReorderNote] = useState(null);
    const visibleReorderNote = reorderNote && reorderNote.key === items.length ? reorderNote.text : "";
    useEffect(() => {
        const pending = pendingFocus.current;
        if (!pending)
            return;
        pendingFocus.current = null;
        const refs = pending.list === "rail" ? railRefs.current : drawerRefs.current;
        refs[pending.index]?.focus({ preventScroll: true });
    });
    const queueFocus = (list, index) => {
        pendingFocus.current = { list, index };
    };
    const handleReorderMove = (from, to) => {
        if (!onReorder || from === to)
            return;
        setReorderNote({
            text: `Moved ${items[from].label} to position ${to + 1} of ${items.length}`,
            key: items.length,
        });
        onReorder({ from, to });
    };
    return { queueFocus, visibleReorderNote, handleReorderMove };
}
