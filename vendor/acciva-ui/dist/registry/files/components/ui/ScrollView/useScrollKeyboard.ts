import type { HTMLAttributes, KeyboardEvent, RefObject } from "react";

interface UseScrollKeyboardOptions {
  isHorizontal: boolean;
  viewportRef: RefObject<HTMLDivElement | null>;
  onKeyDown: HTMLAttributes<HTMLDivElement>["onKeyDown"];
  getScrollDelta: (customDelta?: number) => number;
  scrollByDelta: (delta: number, behavior?: ScrollBehavior) => void;
  scrollToStart: (behavior?: ScrollBehavior) => void;
  scrollToEnd: (behavior?: ScrollBehavior) => void;
}

export function useScrollKeyboard({
  isHorizontal,
  viewportRef,
  onKeyDown,
  getScrollDelta,
  scrollByDelta,
  scrollToStart,
  scrollToEnd,
}: UseScrollKeyboardOptions) {
  return (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;

    const el = viewportRef.current;
    if (!el) return;

    const delta = getScrollDelta();
    const pageSize = isHorizontal ? el.clientWidth * 0.85 : el.clientHeight * 0.85;

    if (isHorizontal) {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        scrollByDelta(-delta);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        scrollByDelta(delta);
      } else if (event.key === "Home") {
        event.preventDefault();
        scrollToStart();
      } else if (event.key === "End") {
        event.preventDefault();
        scrollToEnd();
      } else if (event.key === "PageUp") {
        event.preventDefault();
        scrollByDelta(-pageSize);
      } else if (event.key === "PageDown") {
        event.preventDefault();
        scrollByDelta(pageSize);
      }
    } else {
      if (event.key === "ArrowUp") {
        event.preventDefault();
        scrollByDelta(-delta);
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        scrollByDelta(delta);
      } else if (event.key === "Home") {
        event.preventDefault();
        scrollToStart();
      } else if (event.key === "End") {
        event.preventDefault();
        scrollToEnd();
      } else if (event.key === "PageUp") {
        event.preventDefault();
        scrollByDelta(-pageSize);
      } else if (event.key === "PageDown") {
        event.preventDefault();
        scrollByDelta(pageSize);
      }
    }
  };
}
