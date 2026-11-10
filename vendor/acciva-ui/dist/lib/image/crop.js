import { decodeImage, isCompressible, renderImage, resolveCompressOptions, } from "./compress.js";
import { clamp } from "../utils.js";
import { ImageProcessError, throwIfAborted } from "./errors.js";
const RATIOS = { "1:1": 1, circle: 1, "4:3": 4 / 3, "16:9": 16 / 9 };
/** Width / height for a locked aspect; `undefined` for `"free"` or an invalid number. */
export function aspectRatio(aspect) {
    if (typeof aspect === "number")
        return Number.isFinite(aspect) && aspect > 0 ? aspect : undefined;
    return RATIOS[aspect];
}
/** Largest centred rect of the ratio, scaled to 80%; free = 80% × 80%. Integers. */
export function initialCropRect(width, height, aspect = "free") {
    const ratio = aspectRatio(aspect);
    let w = width;
    let h = height;
    if (ratio) {
        if (width / height > ratio)
            w = height * ratio;
        else
            h = width / ratio;
    }
    w = Math.max(1, Math.round(w * 0.8));
    h = Math.max(1, Math.round(h * 0.8));
    return { x: Math.round((width - w) / 2), y: Math.round((height - h) / 2), width: w, height: h };
}
/** Fits `rect` inside the image, at least `minSize` per edge (capped to the image), at `aspect`. Integers. */
export function clampCropRect(rect, width, height, aspect = "free", minSize = 1) {
    const min = clamp(minSize, 1, Math.min(width, height));
    let w = clamp(rect.width, min, width);
    let h = clamp(rect.height, min, height);
    const ratio = aspectRatio(aspect);
    if (ratio) {
        h = w / ratio;
        if (h < min)
            [h, w] = [min, min * ratio];
        if (w > width)
            [w, h] = [width, width / ratio];
        if (h > height)
            [h, w] = [height, height * ratio];
    }
    w = Math.max(1, Math.round(w));
    h = Math.max(1, Math.round(h));
    return {
        x: clamp(Math.round(rect.x), 0, width - w),
        y: clamp(Math.round(rect.y), 0, height - h),
        width: w,
        height: h,
    };
}
/** Same set as `isCompressible`: raster images canvas can decode. */
export const isCroppable = isCompressible;
/**
 * Crops `rect` out of `file` (EXIF orientation applied), then scales/encodes like `compressImage`.
 * Without `options` keeps the cropped size and source format at quality 0.92. Always returns a new File.
 */
export async function cropImage(file, rect, options, init) {
    throwIfAborted(init?.signal);
    if (!isCroppable(file))
        throw new ImageProcessError("unsupported");
    const bitmap = await decodeImage(file, init?.signal);
    try {
        const x = Math.round(clamp(rect.x, 0, bitmap.width));
        const y = Math.round(clamp(rect.y, 0, bitmap.height));
        const width = Math.round(clamp(rect.x + rect.width, 0, bitmap.width)) - x;
        const height = Math.round(clamp(rect.y + rect.height, 0, bitmap.height)) - y;
        if (!(width > 0 && height > 0))
            throw new ImageProcessError("rect");
        const resolved = options
            ? resolveCompressOptions(options)
            : { maxWidth: Infinity, maxHeight: Infinity, quality: 0.92, format: "original" };
        return await renderImage(file, bitmap, { x, y, width, height }, resolved, false, init?.signal);
    }
    finally {
        bitmap.close();
    }
}
