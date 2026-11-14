import { type KeyboardEvent, type RefObject } from "react";
import { useRovingFocus } from "@/components/ui/_internal/useRovingFocus";

// Alt+Arrow reorder step per key; Up/Down arrows without Alt are the roving core's.
const ALT_STEP: Record<string, number> = { ArrowUp: -1, ArrowDown: 1 };

/**
 * One list's keyboard: roving focus over its links (core, wraps, Home/End) with Alt+Arrow
 * reorder (SC 2.1.1) layered on top. Links stay in the natural tab order (no roving tabindex).
 */
export function useSidebarListKeys({
  containerRef,
  list,
  refs,
  count,
  canReorder,
  queueFocus,
  move,
}: {
  containerRef: RefObject<HTMLUListElement | null>;
  list: "rail" | "drawer";
  refs: RefObject<(HTMLAnchorElement | null)[]>;
  count: number;
  canReorder: boolean;
  queueFocus: (list: "rail" | "drawer", index: number) => void;
  move: (from: number, to: number) => void;
}) {
  const rove = useRovingFocus({ containerRef, itemSelector: "a[href]", orientation: "vertical" });
  return (event: KeyboardEvent<HTMLUListElement>) => {
    const step = ALT_STEP[event.key];
    if (!event.altKey || step === undefined) return rove(event);
    const from = refs.current.findIndex((node) => node === document.activeElement);
    const to = from + step;
    if (!canReorder || from === -1 || to < 0 || to >= count) return;
    event.preventDefault();
    queueFocus(list, to);
    move(from, to);
  };
}
