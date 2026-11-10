import { FLICK_DISTANCE_THRESHOLD_PX, FLICK_ORIGIN_TOLERANCE_PX, FLICK_VELOCITY_PX_MS, VELOCITY_WINDOW_MS } from "./constants.js";
export function axisCoord(event, isVertical) {
    return isVertical ? event.clientY : event.clientX;
}
/** `left` grows with the pointer; `bottom` and `right` grow against it. */
export function growthSignFor(side) {
    return side === "left" ? 1 : -1;
}
export function startPointerDrag(event, isVertical, restSize) {
    event.currentTarget.setPointerCapture?.(event.pointerId);
    return {
        startCoord: axisCoord(event, isVertical),
        startSize: restSize,
        samples: [{ t: performance.now(), h: restSize }],
    };
}
/** Records the pointer's clamped size as a sample and returns it. */
export function trackPointerMove(drag, event, isVertical, side, full) {
    const rawNext = drag.startSize + growthSignFor(side) * (axisCoord(event, isVertical) - drag.startCoord);
    const next = Math.max(0, Math.min(full, rawNext));
    const now = performance.now();
    drag.samples.push({ t: now, h: next });
    while (drag.samples.length > 1 && now - drag.samples[0].t > VELOCITY_WINDOW_MS)
        drag.samples.shift();
    return next;
}
export function releasePointer(event) {
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
        event.currentTarget.releasePointerCapture?.(event.pointerId);
    }
}
export function summarizeDrag(drag) {
    const first = drag.samples[0];
    const last = drag.samples[drag.samples.length - 1];
    const dt = last.t - first.t;
    const velocity = dt > 0 ? (last.h - first.h) / dt : 0;
    const travelDistance = last.h - drag.startSize;
    return { last, velocity, travelDistance };
}
export function isClosingFlickFromPeek(drag, velocity, travelDistance, last, peek) {
    const isClosingFlick = velocity <= -FLICK_VELOCITY_PX_MS && travelDistance <= -FLICK_DISTANCE_THRESHOLD_PX;
    return isClosingFlick && (drag.startSize <= peek + FLICK_ORIGIN_TOLERANCE_PX || last.h < peek);
}
