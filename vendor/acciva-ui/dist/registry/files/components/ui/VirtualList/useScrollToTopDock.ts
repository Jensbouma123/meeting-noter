import { useState } from "react";
import { SCROLL_TO_TOP_DOCK_ENTER_DISTANCE, SCROLL_TO_TOP_DOCK_EXIT_DISTANCE } from "@/components/ui/VirtualList/constants";

/** Returns whether the scroll-to-top button is full width: by option, or docked at the bottom. */
export function useScrollToTopDock(canDock: boolean, distanceToBottom: number, fullWidth: boolean): boolean {
  const [scrollToTopDocked, setScrollToTopDocked] = useState(false);
  const isAtBottom =
    canDock &&
    distanceToBottom <=
      (scrollToTopDocked ? SCROLL_TO_TOP_DOCK_EXIT_DISTANCE : SCROLL_TO_TOP_DOCK_ENTER_DISTANCE);
  // Reconciling the latch during render (rather than in an effect) keeps the
  // committed DOM and the latch in the same frame, so the width transition never
  // starts from a stale state.
  if (isAtBottom !== scrollToTopDocked) setScrollToTopDocked(isAtBottom);
  return fullWidth || isAtBottom;
}
