import type { CropRect } from "../../../lib/image/index.js";
import type { CropCorner, Point, Size } from "./types.js";
export declare const pct: (part: number, whole: number) => string;
/**
 * Resizes `rect` by moving `corner` to `point` while the opposite corner stays put. With a
 * locked ratio the `drive` axis sets the size and the other follows — pointer drags let the
 * larger change win, arrow keys drive the axis they point along.
 */
export declare function resizeRect(rect: CropRect, corner: CropCorner, point: Point, image: Size, ratio: number | undefined, minSize: number, drive: "x" | "y" | "auto"): CropRect;
