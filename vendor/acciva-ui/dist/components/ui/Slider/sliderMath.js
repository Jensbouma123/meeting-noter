export function clampValue(value, min, max) {
    return Math.min(max, Math.max(min, value));
}
// Degenerate range (max <= min) resolves to 0 instead of NaN; out-of-range values clamp to the track.
export function valueToPercent(value, min, max) {
    const span = max - min;
    if (!(span > 0))
        return 0;
    return clampValue(((value - min) / span) * 100, 0, 100);
}
