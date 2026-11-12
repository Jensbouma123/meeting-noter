import type { KeyboardEvent, RefObject } from "react";
import type { DragState } from "@/components/ui/Tabs/tabListDragFrame";

interface TabListKeysOptions {
  listRef: RefObject<HTMLDivElement | null>;
  horizontal: boolean;
  drag: RefObject<DragState | null>;
  stopDrag: (commit: boolean) => void;
}

export function useTabListKeys({ listRef, horizontal, drag, stopDrag }: TabListKeysOptions) {
  return (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" && drag.current?.active) return stopDrag(false);
    const list = listRef.current;
    if (!list) return;
    const tabs = Array.from(list.querySelectorAll<HTMLButtonElement>('[role="tab"]:not([disabled])'));
    if (tabs.length === 0) return;
    const currentIndex = tabs.findIndex((tab) => tab === document.activeElement);
    if (currentIndex === -1) return;

    // APG: Up/Down belong to a vertical tablist; on a horizontal one they stay with page scroll.
    const next = horizontal ? "ArrowRight" : "ArrowDown";
    const prev = horizontal ? "ArrowLeft" : "ArrowUp";
    let nextIndex: number | null = null;
    switch (event.key) {
      case next:
        nextIndex = (currentIndex + 1) % tabs.length;
        break;
      case prev:
        nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = tabs.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    tabs[nextIndex].focus();
    tabs[nextIndex].click();
  };
}
