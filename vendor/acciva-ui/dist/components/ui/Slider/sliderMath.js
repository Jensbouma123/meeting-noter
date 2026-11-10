export function clampValue(value, min, max) {
    return Math.min(max, Math.max(min, value));
}
