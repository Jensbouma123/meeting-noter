import { clamp } from "../../../lib/utils.js";
export const pct = (part, whole) => `${(part / whole) * 100}%`;
/**
 * Resizes `rect` by moving `corner` to `point` while the opposite corner stays put. With a
 * locked ratio the `drive` axis sets the size and the other follows — pointer drags let the
 * larger change win, arrow keys drive the axis they point along.
 */
export function resizeRect(rect, corner, point, image, ratio, minSize, drive) {
    const left = corner.endsWith("left");
    const top = corner.startsWith("top");
    const anchorX = left ? rect.x + rect.width : rect.x;
    const anchorY = top ? rect.y + rect.height : rect.y;
    const maxW = left ? anchorX : image.width - anchorX;
    const maxH = top ? anchorY : image.height - anchorY;
    let width = clamp(left ? anchorX - point.x : point.x - anchorX, minSize, maxW);
    let height = clamp(top ? anchorY - point.y : point.y - anchorY, minSize, maxH);
    if (ratio) {
        const axis = drive === "auto" ? (width / height > ratio ? "x" : "y") : drive;
        if (axis === "x")
            height = width / ratio;
        else
            width = height * ratio;
        const fit = Math.min(1, maxW / width, maxH / height);
        width *= fit;
        height *= fit;
    }
    const x = Math.round(left ? anchorX - width : anchorX);
    const y = Math.round(top ? anchorY - height : anchorY);
    return {
        x,
        y,
        width: left ? anchorX - x : Math.round(width),
        height: top ? anchorY - y : Math.round(height),
    };
}
