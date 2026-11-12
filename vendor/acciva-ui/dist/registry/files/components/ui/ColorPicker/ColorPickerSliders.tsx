import { useRef, type CSSProperties, type KeyboardEvent } from "react";
import { SLIDER_THUMB_SIZE, SLIDER_THUMB_TARGET } from "@/lib/sizing-tokens/index";
import { clamp, cn } from "@/lib/utils";
import { LARGE_STEP, THUMB_PAINT, stepFor, trackDrag } from "@/components/ui/ColorPicker/colorPickerUtils";

interface ChannelSliderProps {
  label: string;
  value: number;
  max: number;
  valueText: string;
  trackStyle: CSSProperties;
  thumbColor: string;
  onChange: (value: number) => void;
}

export function ChannelSlider({ label, value, max, valueText, trackStyle, thumbColor, onChange }: ChannelSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const rounded = Math.round(value);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = stepFor(event);
    const next: Record<string, number> = {
      ArrowRight: rounded + step,
      ArrowUp: rounded + step,
      ArrowLeft: rounded - step,
      ArrowDown: rounded - step,
      PageUp: rounded + LARGE_STEP,
      PageDown: rounded - LARGE_STEP,
      Home: 0,
      End: max,
    };
    if (!(event.key in next)) return;
    event.preventDefault();
    onChange(clamp(next[event.key], 0, max));
  };

  return (
    <div
      ref={trackRef}
      onPointerDown={(event) => {
        thumbRef.current?.focus();
        trackDrag(event, trackRef.current, (x) => onChange(x * max));
      }}
      className="relative h-6 w-full cursor-pointer touch-none"
    >
      <div aria-hidden="true" className="absolute inset-x-0 top-1/2 h-3 -translate-y-1/2 rounded-full" style={trackStyle} />
      <div
        ref={thumbRef}
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-orientation="horizontal"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={rounded}
        aria-valuetext={valueText}
        onKeyDown={handleKeyDown}
        className={cn(
          "focus-ring absolute top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full",
          SLIDER_THUMB_TARGET.md,
        )}
        style={{ left: `${(value / max) * 100}%` }}
      >
        <span aria-hidden="true" className={cn(THUMB_PAINT, SLIDER_THUMB_SIZE.md)} style={{ backgroundColor: thumbColor }} />
      </div>
    </div>
  );
}
