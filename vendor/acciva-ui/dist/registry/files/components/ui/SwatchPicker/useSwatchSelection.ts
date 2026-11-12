import { useState } from "react";
import { selectionHex } from "@/components/ui/SwatchPicker/options";
import type { ResolvedOption, SwatchDetails } from "@/components/ui/SwatchPicker/types";

// Returns a tuple, not an object: property names are not minified, so
// `[current, activeIndex, select, setFocusIndex]` costs fewer bytes than keys.
export function useSwatchSelection(
  resolved: ResolvedOption[],
  value: string | null | undefined,
  defaultValue: string | null,
  onChange: ((value: string, details: SwatchDetails) => void) | undefined,
  disabled: boolean,
) {
  const isControlled = value !== undefined;
  const [uncontrolled, setUncontrolled] = useState<string | null>(defaultValue);
  const current = selectionHex(isControlled ? value : uncontrolled);
  const selectedIndex = resolved.findIndex((option) => option.hex === current);

  const [focusIndex, setFocusIndex] = useState<number>(() =>
    selectedIndex >= 0 ? selectedIndex : 0,
  );
  const activeIndex = selectedIndex >= 0 ? selectedIndex : focusIndex;

  const select = (index: number) => {
    if (disabled) return;
    const option = resolved[index];
    if (!option) return;
    setFocusIndex(index);
    if (option.hex === current) return;
    if (!isControlled) setUncontrolled(option.hex);
    onChange?.(option.hex, { hex: option.hex, rgba: option.rgba, label: option.label });
  };

  return [current, activeIndex, select, setFocusIndex] as const;
}
