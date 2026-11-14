import type { KeyboardEvent, KeyboardEventHandler, RefObject } from "react";
import { rovingIndex } from "@/components/ui/_internal/rovingIndex";

// Roving-tabindex keyboard model: arrows and Home/End move focus and selection.
export function useSwatchKeyboard(
  count: number,
  activeIndex: number,
  disabled: boolean,
  optionRefs: RefObject<(HTMLButtonElement | null)[]>,
  select: (index: number) => void,
  onKeyDown: KeyboardEventHandler<HTMLDivElement> | undefined,
) {
  return (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || disabled) return;
    const focused = optionRefs.current.findIndex((node) => node === document.activeElement);
    const next = rovingIndex({
      key: event.key,
      current: focused === -1 ? activeIndex : focused,
      count,
      orientation: "both",
      wrap: true,
    });
    if (next === null) return;
    event.preventDefault();
    optionRefs.current[next]?.focus();
    select(next);
  };
}
