/** A computed `translate` ("none", "Xpx" or "Xpx Ypx") as `[x, y]` px. */
export function parseTranslate(value) {
    if (!value || value === "none")
        return [0, 0];
    const [x = 0, y = 0] = value.trim().split(/\s+/).map((v) => parseFloat(v) || 0);
    return [x, y];
}
/**
 * The FLIP start `translate` for a group hand-off, from trigger rects only: anchor positioning keeps
 * the bubble a fixed margin off its trigger's `side` edge and centred on the other axis, so at the
 * old size it sits where it did, moved by the anchor point's shift. `shift` is the old bubble's
 * own in-flight translate (a hand-off mid-glide). The bubble's own rect right after re-anchoring is
 * never used: Chrome lays out that first frame off its final spot.
 */
export function glideOffset(side, from, to, shift = [0, 0]) {
    const cx = (b) => b.left + b.width / 2;
    const cy = (b) => b.top + b.height / 2;
    const edge = { top: "top", bottom: "bottom", left: "left", right: "right" };
    const main = from[edge[side]] - to[edge[side]];
    const [dx, dy] = side === "top" || side === "bottom" ? [cx(from) - cx(to), main] : [main, cy(from) - cy(to)];
    return [dx + shift[0], dy + shift[1]];
}
