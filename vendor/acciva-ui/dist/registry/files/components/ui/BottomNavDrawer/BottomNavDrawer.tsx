"use client";

import { useId, useLayoutEffect, useRef, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import { HIDE_AT_CLASSES } from "@/components/ui/BottomNav/BottomNavClasses";
import { useBottomNavHeight } from "@/components/ui/BottomNav/useBottomNavHeight";
import { BODY_CLASS, GRIP_CLASS, HANDLE_CLASS, HEADER_CLASS, PANEL_CLASS, PANEL_MOTION_CLASS, HANDLE_GRAB_CLASS, PEEK_CLASS, ROOT_CLASS, SNAP_TRANSLATE } from "@/components/ui/BottomNavDrawer/classes";
import type { BottomNavDrawerProps, BottomNavDrawerSnap } from "@/components/ui/BottomNavDrawer/types";
import { useHugSizes } from "@/components/ui/BottomNavDrawer/useHugSizes";
import { useDrawerDrag } from "@/components/ui/BottomNavDrawer/useDrawerDrag";
import { usePeekHeight } from "@/components/ui/BottomNavDrawer/usePeekHeight";
import { useSnapState } from "@/components/ui/BottomNavDrawer/useSnapState";

/**
 * A non-modal drawer behind a `BottomNav`, growing out of the bar's top edge. Collapsed, the
 * handle and peek row show; open, the body. No dialog, no focus trap, no backdrop: the page
 * and the bar stay usable, and the collapsed body is `inert` (SC 2.4.3).
 */
export function BottomNavDrawer({
  label,
  children,
  peek,
  snap: snapProp,
  defaultSnap,
  open,
  defaultOpen = false,
  onOpenChange,
  halfDetent = false,
  onSnapChange,
  hug = false,
  draggable = true,
  hideAt = "md",
  id,
  className,
}: BottomNavDrawerProps) {
  const generatedId = useId();
  const bodyId = id ?? generatedId;
  const navHeight = useBottomNavHeight();
  const headerRef = usePeekHeight();
  const panelRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLButtonElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const hugSizes = useHugSizes(hug, panelRef, headerRef);

  // Settled panel height per snap, read live: layout heights do not depend on the translate.
  const heightOf = (target: BottomNavDrawerSnap) => {
    const panel = panelRef.current?.getBoundingClientRect().height ?? 0;
    const header = headerRef.current?.getBoundingClientRect().height ?? 0;
    if (target === "peek") return header;
    if (target === "full") return panel;
    return hug ? hugSizes.half : header + (panel - header) / 2;
  };

  const { snap, order, setSnap } = useSnapState({
    snap: snapProp, defaultSnap, open, defaultOpen, halfDetent, onOpenChange, onSnapChange, heightOf,
  });
  const isOpen = snap !== "peek";

  // Collapsing with focus in the body would strand it on an `inert` node: hand it to the handle.
  const commit = (next: BottomNavDrawerSnap) => {
    if (next === "peek" && bodyRef.current?.contains(document.activeElement)) handleRef.current?.focus();
    setSnap(next);
  };

  // A controlled `open={false}` collapses without passing through `commit`.
  useLayoutEffect(() => {
    if (snap === "peek" && bodyRef.current?.contains(document.activeElement)) handleRef.current?.focus();
  }, [snap]);

  const drag = useDrawerDrag({ panelRef, headerRef, order, snap, commit, enabled: draggable });
  const index = order.indexOf(snap);

  const onHandleClick = () => commit(order[(index + 1) % order.length]);

  const onHandleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!halfDetent || (event.key !== "ArrowUp" && event.key !== "ArrowDown")) return;
    event.preventDefault();
    const step = event.key === "ArrowUp" ? 1 : -1;
    commit(order[Math.min(order.length - 1, Math.max(0, index + step))]);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Escape" || !isOpen) return;
    event.stopPropagation();
    handleRef.current?.focus();
    commit("peek");
  };

  // `hug` places `half` at half the hugged panel; everything else rests on the CSS translates.
  const restTranslate =
    hug && snap === "half" && hugSizes.full > 0 ? `0 ${hugSizes.full - hugSizes.half}px` : SNAP_TRANSLATE[snap];
  const translate = drag.offset === null ? restTranslate : `0 ${drag.offset}px`;

  return (
    <section
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn(ROOT_CLASS, HIDE_AT_CLASSES[hideAt], className)}
      style={navHeight > 0 ? { bottom: navHeight } : undefined}
    >
      <div
        ref={panelRef}
        data-snap={snap}
        className={cn(PANEL_CLASS, drag.offset === null && PANEL_MOTION_CLASS)}
        style={{ translate }}
      >
        <div ref={headerRef} className={draggable ? HEADER_CLASS : undefined} {...drag.header}>
          <button
            ref={handleRef}
            type="button"
            data-bottom-nav-drawer-handle
            aria-label={label}
            aria-expanded={isOpen}
            aria-controls={bodyId}
            onClick={onHandleClick}
            onKeyDown={onHandleKeyDown}
            className={cn(HANDLE_CLASS, draggable && HANDLE_GRAB_CLASS)}
          >
            <span aria-hidden="true" className={GRIP_CLASS} />
          </button>
          {peek ? <div className={PEEK_CLASS}>{peek}</div> : null}
        </div>
        <div id={bodyId} ref={bodyRef} inert={!isOpen} className={BODY_CLASS} {...drag.body}>
          {children}
        </div>
      </div>
    </section>
  );
}
