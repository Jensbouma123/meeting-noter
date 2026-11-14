import { useCallback, useEffect, useRef } from "react";
import { clampValue } from "./sliderMath.js";
export function useSliderPointer({ min, max, step, disabled, onChange }) {
    const trackRef = useRef(null);
    const thumbRef = useRef(null);
    // Tears down the active drag's window listeners; held in a ref so unmount can reach it.
    const stopDragRef = useRef(null);
    // Drag listeners outlive the render that created them, so they call the latest setter through this ref.
    const setFromClientXRef = useRef(() => { });
    const setFromClientX = useCallback((clientX) => {
        const track = trackRef.current;
        if (!track)
            return;
        const rect = track.getBoundingClientRect();
        // A zero-width track (hidden or collapsed) has no measurable position: skip rather than emit NaN.
        if (!(rect.width > 0))
            return;
        const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
        const raw = min + ratio * (max - min);
        const stepped = Math.round(raw / step) * step;
        onChange(clampValue(stepped, min, max));
    }, [max, min, onChange, step]);
    useEffect(() => {
        setFromClientXRef.current = setFromClientX;
    }, [setFromClientX]);
    useEffect(() => () => stopDragRef.current?.(), []);
    const handlePointerDown = (event) => {
        if (disabled)
            return;
        // preventDefault keeps the track from stealing focus; the thumb gets it so keys work after a drag.
        event.preventDefault();
        thumbRef.current?.focus();
        setFromClientX(event.clientX);
        const move = (moveEvent) => setFromClientXRef.current(moveEvent.clientX);
        const stop = () => {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", stop);
            window.removeEventListener("pointercancel", stop);
            stopDragRef.current = null;
        };
        stopDragRef.current = stop;
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", stop);
        window.addEventListener("pointercancel", stop);
    };
    return { trackRef, thumbRef, handlePointerDown };
}
