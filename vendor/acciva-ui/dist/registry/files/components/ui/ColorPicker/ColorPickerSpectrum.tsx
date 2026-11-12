import { useRef, type KeyboardEvent } from "react";
import { hsvToRgb, rgbaToHex, type HSVA } from "@/lib/color/formats/index";
import { SLIDER_THUMB_SIZE, SLIDER_THUMB_TARGET } from "@/lib/sizing-tokens/index";
import { clamp, cn } from "@/lib/utils";
import { LARGE_STEP, THUMB_PAINT, cssColor, stepFor, trackDrag } from "@/components/ui/ColorPicker/colorPickerUtils";

interface SpectrumProps {
  hsva: HSVA;
  onChange: (hsva: HSVA) => void;
}

export function Spectrum({ hsva, onChange }: SpectrumProps) {
  const areaRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const saturation = Math.round(hsva.s);
  const brightness = Math.round(hsva.v);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = stepFor(event);
    const next: Record<string, Partial<HSVA>> = {
      ArrowLeft: { s: hsva.s - step },
      ArrowRight: { s: hsva.s + step },
      ArrowUp: { v: hsva.v + step },
      ArrowDown: { v: hsva.v - step },
      PageUp: { v: hsva.v + LARGE_STEP },
      PageDown: { v: hsva.v - LARGE_STEP },
      Home: { s: 0 },
      End: { s: 100 },
    };
    const change = next[event.key];
    if (!change) return;
    event.preventDefault();
    const merged = { ...hsva, ...change };
    onChange({ ...merged, s: clamp(Math.round(merged.s), 0, 100), v: clamp(Math.round(merged.v), 0, 100) });
  };

  return (
    <div
      ref={areaRef}
      onPointerDown={(event) => {
        thumbRef.current?.focus();
        trackDrag(event, areaRef.current, (x, y) => onChange({ ...hsva, s: x * 100, v: (1 - y) * 100 }));
      }}
      className="relative h-48 w-full cursor-crosshair touch-none rounded-md md:h-40"
      style={{ backgroundColor: rgbaToHex(hsvToRgb({ h: hsva.h, s: 100, v: 100, a: 1 })) }}
    >
      <div aria-hidden="true" className="absolute inset-0 rounded-md bg-linear-to-r from-white to-transparent" />
      <div aria-hidden="true" className="absolute inset-0 rounded-md bg-linear-to-t from-black to-transparent" />
      <div
        ref={thumbRef}
        role="slider"
        tabIndex={0}
        aria-roledescription="2D slider"
        aria-label="Saturation and brightness"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={saturation}
        aria-valuetext={`Saturation ${saturation}%, brightness ${brightness}%`}
        onKeyDown={handleKeyDown}
        className={cn(
          "focus-ring absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full",
          SLIDER_THUMB_TARGET.md,
        )}
        style={{ left: `${hsva.s}%`, top: `${100 - hsva.v}%` }}
      >
        <span
          aria-hidden="true"
          className={cn(THUMB_PAINT, SLIDER_THUMB_SIZE.md)}
          style={{ backgroundColor: cssColor({ ...hsvToRgb(hsva), a: 1 }) }}
        />
      </div>
    </div>
  );
}
