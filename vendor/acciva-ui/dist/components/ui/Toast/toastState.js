let toastIdCounter = 0;
export function generateToastId() {
    toastIdCounter += 1;
    return `toast-${toastIdCounter}`;
}
export function isTopPosition(position) {
    return position.startsWith("top");
}
export function removeToast(prev, id, maxVisible) {
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
    return rest.map((t) => (t.id === nextQueued.id ? { ...t, status: "visible" } : t));
}
