import { useLayoutEffect, useState, type RefObject } from "react";
import { resolveDetentSizes } from "@/components/ui/Drawer/resolveDetentSizes";

const ZERO = { peek: 0, half: 0, full: 0 };

/**
 * With `hug`, the visible heights (px) of each snap: `Drawer`'s `resolveDetentSizes` fed the
 * measured handle + peek row as the peek and the content-hugged panel (already capped by
 * `max-h-bottom-nav-drawer`) as the max. `full` is the panel; `half` is half of it.
 */
export function useHugSizes(
  enabled: boolean,
  panelRef: RefObject<HTMLElement | null>,
  headerRef: RefObject<HTMLElement | null>,
) {
  const [sizes, setSizes] = useState(ZERO);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    const header = headerRef.current;
    if (!enabled || !panel || !header) return;
    const measure = () => {
      const maxSize = panel.getBoundingClientRect().height;
      const next = resolveDetentSizes({
        available: window.innerHeight,
        referenceEl: panel,
        axis: "vertical",
        modality: "persistent",
        maxSize,
        autoContentSize: header.getBoundingClientRect().height,
      });
      setSizes((prev) => (prev.peek === next.peek && prev.half === next.half && prev.full === next.full ? prev : next));
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(panel);
    observer.observe(header);
    return () => observer.disconnect();
  }, [enabled, panelRef, headerRef]);

  return sizes;
}
