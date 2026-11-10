import { DEFAULT_HEIGHT } from "./constants.js";
export function resolveViewportHeight(height) {
    return typeof height === "number" ? height : DEFAULT_HEIGHT;
}
export function resolveContainerStyle(height) {
    return {
        height: typeof height === "number" ? `${height}px` : height,
        contain: "layout paint",
        overscrollBehavior: "contain",
        WebkitOverflowScrolling: "touch",
    };
}
export function findOffsetIndex(offsets, position) {
    let lo = 0;
    let hi = offsets.length - 2;
    while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (offsets[mid] <= position)
            lo = mid;
        else
            hi = mid - 1;
    }
    return lo;
}
