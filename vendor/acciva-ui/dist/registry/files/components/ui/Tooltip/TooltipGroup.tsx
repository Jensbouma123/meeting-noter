"use client";

import { useEffect, useState } from "react";
import { createGroupApi, TooltipGroupContext, type TooltipGroupState } from "@/components/ui/Tooltip/groupApi";
import { TooltipBubble } from "@/components/ui/Tooltip/TooltipBubble";
import type { TooltipGroupProps } from "@/components/ui/Tooltip/types";

/**
 * Lets a row of Tooltips share one bubble: while it is open (or closed less than `skipDelay` ms
 * ago) another trigger opens with no delay, and a hand-off glides the bubble to the new anchor.
 */
export function TooltipGroup({ children, skipDelay = 300 }: TooltipGroupProps) {
  const [state, setState] = useState<TooltipGroupState>({ slot: null, from: null, seq: 0 });
  const [{ api, bubbleRef, skipDelayRef }] = useState(() => createGroupApi(setState));
  useEffect(() => {
    skipDelayRef.current = skipDelay;
  }, [skipDelay, skipDelayRef]);
  const { slot, from, seq } = state;

  return (
    <TooltipGroupContext.Provider value={api}>
      {children}
      {slot ? <TooltipBubble {...slot} bubbleRef={bubbleRef} morph={{ from, seq, onSettled: api.settle }} /> : null}
    </TooltipGroupContext.Provider>
  );
}
