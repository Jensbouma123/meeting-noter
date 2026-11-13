"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef } from "react";
import { TEXT_SIZE } from "../../../lib/sizing-tokens/index.js";
import { SURFACE_SHADOW } from "../../../lib/surface-tokens.js";
import { cn } from "../../../lib/utils.js";
import { TOOLTIP_FILL } from "./constants.js";
import { useTooltipBubble } from "./useTooltipBubble.js";
import { useTooltipMorph } from "./useTooltipMorph.js";
/** The open bubble: mounted only while shown, so `role="tooltip"` is in the DOM only when visible. */
export function TooltipBubble({ bubbleRef, morph, ...slot }) {
    const ownRef = useRef(null);
    const ref = bubbleRef ?? ownRef;
    const { id, anchorName, content, side, maxWidth, triggerRef, hide, touchOpenRef } = slot;
    const [placed, sync] = useTooltipBubble(side, anchorName, triggerRef, ref, hide, touchOpenRef);
    useTooltipMorph(ref, morph, sync);
    return (_jsx("div", { ref: ref, role: "tooltip", id: id, popover: "manual", "data-side": side, "data-placed": placed, style: {
            positionAnchor: anchorName,
            maxWidth: typeof maxWidth === "number" ? `${maxWidth}px` : maxWidth,
        }, className: cn("tooltip rounded-lg border border-solid px-3 py-2 font-medium text-foreground break-words whitespace-normal leading-relaxed", TEXT_SIZE.xs, TOOLTIP_FILL, SURFACE_SHADOW.overlay), children: morph ? (_jsxs("div", { className: "tooltip-body", children: [morph.from ? (_jsx("div", { className: "tooltip-layer", "data-layer": "out", "aria-hidden": "true", children: morph.from.content })) : null, _jsx("div", { className: "tooltip-layer", "data-layer": "in", children: content })] })) : (content) }));
}
