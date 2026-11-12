import { useCallback, useLayoutEffect, useState, type RefObject } from "react";
import { resolveDetentSizes } from "@/components/ui/Drawer/resolveDetentSizes";
import type { DrawerAxis, DrawerDetent, DrawerLength, DrawerModality } from "@/components/ui/Drawer/types";

/** Measures the panel's detent sizes in px, re-measuring on resize and on content growth. */
export function useDetentSizes(
  open: boolean,
  modality: DrawerModality,
  axis: DrawerAxis,
  isVertical: boolean,
  minSize: DrawerLength | undefined,
  defaultSize: DrawerLength | undefined,
  maxSize: DrawerLength | undefined,
  wrapperRef: RefObject<HTMLDivElement | null>,
  sheetRef: RefObject<HTMLDialogElement | null>,
  contentRef: RefObject<HTMLDivElement | null>,
  innerContentRef: RefObject<HTMLDivElement | null>,
  setSizeResolved: (resolved: boolean) => void,
): Record<DrawerDetent, number> {
  const [autoContentSize, setAutoContentSize] = useState(0);
  const [detentSizes, setDetentSizes] = useState<Record<DrawerDetent, number>>({ peek: 0, half: 0, full: 0 });

  const recompute = useCallback(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const rect = wrapper.getBoundingClientRect();
    const viewport = typeof window === "undefined" ? 0 : isVertical ? window.innerHeight : window.innerWidth;
    const available = (isVertical ? rect.height : rect.width) || viewport;

    setDetentSizes(
      resolveDetentSizes({
        available,
        referenceEl: wrapper,
        axis,
        modality,
        minSize,
        defaultSize,
        maxSize,
        autoContentSize,
      }),
    );
    setSizeResolved(true);
  }, [wrapperRef, axis, isVertical, modality, minSize, defaultSize, maxSize, autoContentSize, setSizeResolved]);

  useLayoutEffect(() => {
    if (!open || minSize !== undefined || !isVertical) return;
    const innerNode = innerContentRef.current;
    const contentNode = contentRef.current;
    const sheet = sheetRef.current;
    if (!innerNode || !contentNode || !sheet) return;

    const measure = () => {
      const grabberEl = sheet.querySelector<HTMLElement>("[data-drawer-grabber]");
      const grabberHeight = grabberEl ? (grabberEl.getBoundingClientRect().height || grabberEl.offsetHeight) : 0;
      const contentStyle = typeof window !== "undefined" ? window.getComputedStyle(contentNode) : null;
      const paddingTop = contentStyle ? parseFloat(contentStyle.paddingTop) || 0 : 0;
      const paddingBottom = contentStyle ? parseFloat(contentStyle.paddingBottom) || 0 : 0;
      const innerHeight = innerNode.getBoundingClientRect().height || innerNode.offsetHeight || innerNode.scrollHeight;
      const total = innerHeight + grabberHeight + paddingTop + paddingBottom;
      if (total > 0) {
        setAutoContentSize(total);
      }
    };

    measure();

    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(innerNode);
    return () => observer.disconnect();
  }, [open, minSize, isVertical, innerContentRef, contentRef, sheetRef]);

  useLayoutEffect(() => {
    if (!open) return;
    recompute();
    window.addEventListener("resize", recompute);
    window.addEventListener("orientationchange", recompute);
    return () => {
      window.removeEventListener("resize", recompute);
      window.removeEventListener("orientationchange", recompute);
    };
  }, [open, recompute]);

  return detentSizes;
}
