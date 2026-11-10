import { DEFAULT_MAX_HEIGHT, DEFAULT_MAX_WIDTH, MIN_VISIBLE_BACKDROP_PX, PERSISTENT_HALF_FRACTION, PERSISTENT_PEEK_FRACTION } from "./constants.js";
import { resolveLength } from "./resolveLength.js";
/**
 * Resolves the three detents to px along the drawer's growth axis. The result is always
 * monotonic (`peek <= half <= full`) so drag, keyboard and controlled detents agree.
 */
export function resolveDetentSizes({ available, referenceEl, axis, modality, minSize, defaultSize, maxSize, autoContentSize = 0, }) {
    const fallbackMax = axis === "vertical" ? DEFAULT_MAX_HEIGHT : DEFAULT_MAX_WIDTH;
    const rawMax = resolveLength(maxSize ?? fallbackMax, referenceEl, axis);
    // A persistent drawer has no backdrop, so nothing needs to stay visible behind it.
    const cap = modality === "modal" && available > MIN_VISIBLE_BACKDROP_PX ? available - MIN_VISIBLE_BACKDROP_PX : available;
    const full = Math.max(0, Math.min(rawMax, cap));
    let peek;
    if (minSize !== undefined)
        peek = resolveLength(minSize, referenceEl, axis);
    else if (autoContentSize > 0)
        peek = autoContentSize;
    else if (defaultSize !== undefined)
        peek = resolveLength(defaultSize, referenceEl, axis);
    else if (modality === "persistent")
        peek = full * PERSISTENT_PEEK_FRACTION;
    else
        peek = full;
    peek = Math.max(0, Math.min(peek, full));
    let half;
    if (defaultSize !== undefined)
        half = resolveLength(defaultSize, referenceEl, axis);
    else if (modality === "persistent")
        half = full * PERSISTENT_HALF_FRACTION;
    else
        half = peek;
    half = Math.min(Math.max(half, peek), full);
    return { peek, half, full };
}
