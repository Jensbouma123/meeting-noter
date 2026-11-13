import type { TooltipSide } from "./types.js";
type Box = Pick<DOMRect, "left" | "top" | "right" | "bottom" | "width" | "height">;
/** A computed `translate` ("none", "Xpx" or "Xpx Ypx") as `[x, y]` px. */
export declare function parseTranslate(value: string | undefined): [number, number];
/**
 * The FLIP start `translate` for a group hand-off, from trigger rects only: anchor positioning keeps
 * the bubble a fixed margin off its trigger's `side` edge and centred on the other axis, so at the
 * old size it sits where it did, moved by the anchor point's shift. `shift` is the old bubble's
 * own in-flight translate (a hand-off mid-glide). The bubble's own rect right after re-anchoring is
 * never used: Chrome lays out that first frame off its final spot.
 */
export declare function glideOffset(side: TooltipSide, from: Box, to: Box, shift?: [number, number]): [number, number];
export {};
