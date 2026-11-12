import type { RefObject } from "react";

export interface DragState {
  id: number;
  x: number;
  y: number;
  start: string;
  active: boolean;
  raf: number;
  grab: number;
  w: number;
  cur: string;
  timer: number;
}

export function clearTarget(list: HTMLElement) {
  list.querySelectorAll<HTMLElement>("[data-drag-target]").forEach((t) => delete t.dataset.dragTarget);
}

// Live selection under the pointer + edge auto-scroll, one step per frame (the rAF is the throttle).
export function tickDrag(
  list: HTMLDivElement,
  indicatorRef: RefObject<HTMLSpanElement | null>,
  drag: RefObject<DragState | null>,
) {
  const d = drag.current;
  if (!d?.active) return;
  const rect = list.getBoundingClientRect();
  // At least two fade widths (1.5rem each at 16px), so narrow lists still auto-scroll.
  const zone = Math.max(rect.width / 8, 48);
  const overflows = list.scrollWidth > list.clientWidth;
  const tabs = Array.from(list.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
  const first = tabs[0];
  const last = tabs[tabs.length - 1];
  if (!first) return;
  // The indicator follows the finger, clamped to the end tabs; its centre decides the selection.
  const indicatorLeft = () =>
    Math.min(
      Math.max(d.x - rect.left + list.scrollLeft - d.grab, first.offsetLeft),
      Math.max(first.offsetLeft, last.offsetLeft + last.offsetWidth - d.w),
    );
  // Edge zones trigger on the finger or the indicator's leading edge, whichever enters first.
  const edgeLeft = rect.left - list.scrollLeft + indicatorLeft();
  const edgeRight = edgeLeft + d.w;
  let step = 0;
  if (overflows && (d.x < rect.left + zone || edgeLeft < rect.left + zone)) {
    step = -Math.max(1, Math.round((rect.left + zone - Math.min(d.x, edgeLeft)) / 4));
  } else if (overflows && (d.x > rect.right - zone || edgeRight > rect.right - zone)) {
    step = Math.max(1, Math.round((Math.max(d.x, edgeRight) - (rect.right - zone)) / 4));
  }
  // One instant scroll per frame: a smooth scroll is cancelled by the next frame's reads.
  const next = Math.min(Math.max(list.scrollLeft + step, 0), list.scrollWidth - list.clientWidth);
  if (next !== list.scrollLeft) list.scrollTo({ left: next, behavior: "instant" });
  const left = indicatorLeft();
  if (indicatorRef.current) indicatorRef.current.style.transform = `translateX(${left}px)`;
  const centre = left + d.w / 2;
  const hit = tabs.find((t) => !t.disabled && centre >= t.offsetLeft && centre < t.offsetLeft + t.offsetWidth);
  if (hit?.dataset.value !== undefined && hit.dataset.value !== d.cur) {
    d.cur = hit.dataset.value;
    clearTarget(list);
    hit.dataset.dragTarget = "";
  }
  d.raf = requestAnimationFrame(() => tickDrag(list, indicatorRef, drag));
}
