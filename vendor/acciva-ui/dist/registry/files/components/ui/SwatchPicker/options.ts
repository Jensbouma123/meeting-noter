import { parseColor, rgbaToHex, type RGBA } from "@/lib/color/formats/index";
import type { SwatchOption, ResolvedOption } from "@/components/ui/SwatchPicker/types";

export function resolveOptions(options: readonly (string | SwatchOption)[]): ResolvedOption[] {
  return options.flatMap((option, index) => {
    const entry = typeof option === "string" ? { value: option } : option;
    const rgba = parseColor(entry.value);
    if (!rgba) {
      if (process.env.NODE_ENV !== "production") {
        console.error(
          `[a11y] <SwatchPicker> dropped unparseable option "${entry.value}" at index ${index}; it is never rendered. Pass a parseColor input (#rgb, #rrggbb, rgb(), hsl(), oklch()).`,
        );
      }
      return [];
    }
    const rounded = roundRgba(rgba);
    const hex = rgbaToHex(rounded);
    return [{ key: `${hex}-${index}`, hex, rgba: rounded, label: entry.label ?? hex }];
  });
}

/** Same rounding as the option hex, so a translucent value matches its swatch. */
function roundRgba(rgba: RGBA): RGBA {
  return {
    r: Math.round(rgba.r),
    g: Math.round(rgba.g),
    b: Math.round(rgba.b),
    a: Math.round(rgba.a * 100) / 100,
  };
}

export function selectionHex(value: string | null | undefined): string | null {
  if (value === undefined || value === null) return null;
  const rgba = parseColor(value);
  return rgba ? rgbaToHex(roundRgba(rgba)) : null;
}
