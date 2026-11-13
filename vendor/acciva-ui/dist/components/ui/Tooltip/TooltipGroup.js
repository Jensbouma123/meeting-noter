"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { createGroupApi, TooltipGroupContext } from "./groupApi.js";
import { TooltipBubble } from "./TooltipBubble.js";
/**
 * Lets a row of Tooltips share one bubble: while it is open (or closed less than `skipDelay` ms
 * ago) another trigger opens with no delay, and a hand-off glides the bubble to the new anchor.
 */
export function TooltipGroup({ children, skipDelay = 300 }) {
    const [state, setState] = useState({ slot: null, from: null, seq: 0 });
    const [{ api, bubbleRef, skipDelayRef }] = useState(() => createGroupApi(setState));
    useEffect(() => {
        skipDelayRef.current = skipDelay;
    }, [skipDelay, skipDelayRef]);
    const { slot, from, seq } = state;
    return (_jsxs(TooltipGroupContext.Provider, { value: api, children: [children, slot ? _jsx(TooltipBubble, { ...slot, bubbleRef: bubbleRef, morph: { from, seq, onSettled: api.settle } }) : null] }));
}
