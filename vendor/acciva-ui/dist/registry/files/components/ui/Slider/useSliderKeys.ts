import type { KeyboardEvent } from "react";
import { clampValue } from "@/components/ui/Slider/sliderMath";
import type { SliderRange } from "@/components/ui/Slider/types";

export function useSliderKeys({ value, min, max, step, disabled, onChange }: SliderRange & { value: number }) {
  return (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const big = (max - min) / 10 || step;
    const actions: Record<string, number> = {
      ArrowRight: value + step,
      ArrowUp: value + step,
      ArrowLeft: value - step,
      ArrowDown: value - step,
      PageUp: value + big,
      PageDown: value - big,
      Home: min,
      End: max,
    };
    if (event.key in actions) {
      event.preventDefault();
      onChange(clampValue(actions[event.key], min, max));
    }
  };
}
