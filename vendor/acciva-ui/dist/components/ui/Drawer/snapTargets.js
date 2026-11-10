import { FLICK_DISTANCE_THRESHOLD_PX, FLICK_VELOCITY_PX_MS } from "./constants.js";
export function pickSnapTarget(height, velocity, points, travelDistance = 0) {
    if (points.length === 0)
        return height;
    if (points.length === 1)
        return points[0];
    const isUpwardFlick = velocity >= FLICK_VELOCITY_PX_MS && travelDistance >= FLICK_DISTANCE_THRESHOLD_PX;
    const isDownwardFlick = velocity <= -FLICK_VELOCITY_PX_MS && travelDistance <= -FLICK_DISTANCE_THRESHOLD_PX;
    if (isUpwardFlick) {
        const higher = points.find((p) => p > height);
        return higher ?? points[points.length - 1];
    }
    if (isDownwardFlick) {
        const lower = [...points].reverse().find((p) => p < height);
        return lower ?? points[0];
    }
    return points.reduce((best, p) => (Math.abs(p - height) < Math.abs(best - height) ? p : best), points[0]);
}
/**
 * Detent-space counterpart to {@link pickSnapTarget}: returns the index of the detent a
 * release at `size` should land on. Ties break toward the detent already selected, so
 * duplicate detent sizes never make the panel appear to jump.
 */
export function pickDetentTarget(size, velocity, detentSizes, travelDistance = 0, currentIndex = 0) {
    if (detentSizes.length === 0)
        return currentIndex;
    const isUpwardFlick = velocity >= FLICK_VELOCITY_PX_MS && travelDistance >= FLICK_DISTANCE_THRESHOLD_PX;
    const isDownwardFlick = velocity <= -FLICK_VELOCITY_PX_MS && travelDistance <= -FLICK_DISTANCE_THRESHOLD_PX;
    if (isUpwardFlick) {
        const next = detentSizes.findIndex((candidate) => candidate > size);
        return next === -1 ? detentSizes.length - 1 : next;
    }
    if (isDownwardFlick) {
        for (let index = detentSizes.length - 1; index >= 0; index -= 1) {
            if (detentSizes[index] < size)
                return index;
        }
        return 0;
    }
    let best = 0;
    for (let index = 1; index < detentSizes.length; index += 1) {
        const distance = Math.abs(detentSizes[index] - size);
        const bestDistance = Math.abs(detentSizes[best] - size);
        if (distance < bestDistance)
            best = index;
        else if (distance === bestDistance && Math.abs(index - currentIndex) < Math.abs(best - currentIndex))
            best = index;
    }
    return best;
}
