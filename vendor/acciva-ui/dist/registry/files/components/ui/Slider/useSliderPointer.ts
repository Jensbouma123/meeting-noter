import { useCallback, useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { clampValue } from "@/components/ui/Slider/sliderMath";
import type { SliderRange } from "@/components/ui/Slider/types";

export function useSliderPointer({ min, max, step, disabled, onChange }: SliderRange) {
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  // Tears down the active drag's window listeners; held in a ref so unmount can reach it.
  const stopDragRef = useRef<(() => void) | null>(null);
  // Drag listeners outlive the render that created them, so they call the latest setter through this ref.
  const setFromClientXRef = useRef<(clientX: number) => void>(() => {});

  const setFromClientX = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      // A zero-width track (hidden or collapsed) has no measurable position: skip rather than emit NaN.
      if (!(rect.width > 0)) return;
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      const raw = min + ratio * (max - min);
      const stepped = Math.round(raw / step) * step;
      onChange(clampValue(stepped, min, max));
    },
    [max, min, onChange, step],
  );

  useEffect(() => {
    setFromClientXRef.current = setFromClientX;
  }, [setFromClientX]);

  useEffect(() => () => stopDragRef.current?.(), []);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    // preventDefault keeps the track from stealing focus; the thumb gets it so keys work after a drag.
    event.preventDefault();
    thumbRef.current?.focus();
    setFromClientX(event.clientX);
    const move = (moveEvent: PointerEvent) => setFromClientXRef.current(moveEvent.clientX);
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
