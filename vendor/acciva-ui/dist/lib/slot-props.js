const isHandler = (key, a, b) => /^on[A-Z]/.test(key) && typeof a === "function" && typeof b === "function";
/**
 * Props a Slot-style `asChild` component merges onto its child. A handler present on both
 * runs the child's first, then the slot's unless the child called `preventDefault()`, so the
 * child's own `onClick` is composed with, never replaced.
 */
export function composeSlotProps(child, slot) {
    const merged = { ...slot };
    for (const key of Object.keys(slot)) {
        if (!isHandler(key, child[key], slot[key]))
            continue;
        merged[key] = (event, ...rest) => {
            child[key](event, ...rest);
            if (!event?.defaultPrevented)
                slot[key](event, ...rest);
        };
    }
    return merged;
}
