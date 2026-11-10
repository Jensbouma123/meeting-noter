import { useCallback, useRef } from "react";
import { clampValue } from "./sliderMath.js";
export function useSliderPointer({ min, max, step, disabled, onChange }) {
    const trackRef = useRef(null);
    const thumbRef = useRef(null);
    const setFromClientX = useCallback((clientX) => {
        const track = trackRef.current;
        if (!track)
            return;
        const rect = track.getBoundingClientRect();
        const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
        const raw = min + ratio * (max - min);
        const stepped = Math.round(raw / step) * step;
        onChange(clampValue(stepped, min, max));
    }, [max, min, onChange, step]);
    const handlePointerDown = (event) => {
        if (disabled)
            return;
        // preventDefault keeps the track from stealing focus; the thumb gets it so keys work after a drag.
        event.preventDefault();
        thumbRef.current?.focus();
        setFromClientX(event.clientX);
        const move = (moveEvent) => setFromClientX(moveEvent.clientX);
        const up = () => {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", up);
            window.removeEventListener("pointercancel", up);
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
        window.addEventListener("pointercancel", up);
    };
    return { trackRef, thumbRef, handlePointerDown };
}
