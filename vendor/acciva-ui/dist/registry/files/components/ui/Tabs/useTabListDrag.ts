import { useRef, type PointerEvent, type RefObject } from "react";
import { placeIndicator } from "@/components/ui/Tabs/placeIndicator";
import { clearTarget, tickDrag, type DragState } from "@/components/ui/Tabs/tabListDragFrame";
import type { TabsVariant } from "@/components/ui/Tabs/types";

// Horizontal travel before a drag on the selected tab claims the gesture; below it the press is a tap.
const DRAG_THRESHOLD = 8;
// Press-and-hold on an unselected tab grabs it after this long, if the pointer has not travelled past the threshold.
const HOLD_MS = 400;

interface TabListDragOptions {
  listRef: RefObject<HTMLDivElement | null>;
  indicatorRef: RefObject<HTMLSpanElement | null>;
  value: string;
  setValue: (value: string) => void;
  variant: TabsVariant;
  canDrag: boolean;
}

export function useTabListDrag({ listRef, indicatorRef, value, setValue, variant, canDrag }: TabListDragOptions) {
  const drag = useRef<DragState | null>(null);

  // Release commits the tab under the pointer; cancel (SC 2.5.2) keeps the start tab. The selection never moves mid-drag (SC 3.2.2).
  const stopDrag = (commit: boolean) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    cancelAnimationFrame(d.raf);
    clearTimeout(d.timer);
    if (!d.active) return;
    const indicator = indicatorRef.current;
    const list = listRef.current;
    if (indicator) delete indicator.dataset.dragging;
    if (list) {
      delete list.dataset.dragging;
      clearTarget(list);
    }
    const settled = commit ? d.cur : d.start;
    if (settled !== d.start) setValue(settled);
    // Spring to the settled tab (React has not committed it yet, so look it up by value).
    placeIndicator(
      indicator,
      Array.from(listRef.current?.querySelectorAll<HTMLElement>('[role="tab"]') ?? []).find((t) => t.dataset.value === settled) ?? null,
      variant,
    );
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!canDrag || (event.pointerType === "mouse" && event.button !== 0)) return;
    const tab = (event.target as HTMLElement).closest<HTMLButtonElement>('[role="tab"]');
    if (!tab || tab.disabled) return;
    const unselected = tab.getAttribute("aria-selected") !== "true";
    // Touch implicitly captures to the tab; release it so moves keep reaching the list.
    if (event.pointerType !== "mouse" && tab.hasPointerCapture?.(event.pointerId)) tab.releasePointerCapture(event.pointerId);
    drag.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      start: value,
      active: false,
      raf: 0,
      grab: event.clientX - tab.getBoundingClientRect().left,
      w: tab.offsetWidth,
      cur: value,
      timer: 0,
    };
    if (unselected) {
      // Hold grabs this tab: the indicator springs to it and the drag may continue; release commits (SC 2.5.2).
      const d = drag.current;
      const list = event.currentTarget;
      d.timer = window.setTimeout(() => {
        d.active = true;
        d.cur = tab.dataset.value ?? value;
        list.dataset.dragging = "";
        list.setPointerCapture?.(d.id);
        tab.dataset.dragTarget = "";
        placeIndicator(indicatorRef.current, tab, variant);
      }, HOLD_MS);
    }
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== event.pointerId) return;
    if (!d.active && d.timer) {
      // Travel before the hold fires is a normal list scroll.
      if (Math.hypot(event.clientX - d.x, event.clientY - d.y) > DRAG_THRESHOLD) {
        clearTimeout(d.timer);
        drag.current = null;
      }
      return;
    }
    if (!d.active) {
      if (Math.abs(event.clientX - d.x) < DRAG_THRESHOLD) return;
      d.active = true;
      d.x = event.clientX;
      d.y = event.clientY;
      // Snapping would undo each small edge scroll, so it stays off until release.
      event.currentTarget.dataset.dragging = "";
      event.currentTarget.setPointerCapture?.(d.id);
    }
    if (!d.raf) {
      // First move of a drag (or of a held tab): the indicator now follows the pointer.
      const list = event.currentTarget;
      if (indicatorRef.current) indicatorRef.current.dataset.dragging = "";
      d.raf = requestAnimationFrame(() => tickDrag(list, indicatorRef, drag));
    }
    d.x = event.clientX;
    d.y = event.clientY;
  };

  return { drag, stopDrag, handlePointerDown, handlePointerMove };
}
