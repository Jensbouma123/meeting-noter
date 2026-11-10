import { ImageProcessError, MAX_CANVAS_PIXELS, MAX_DECODE_PIXELS, throwIfAborted } from "./errors.js";
const preset = (edge) => ({
    maxWidth: edge,
    maxHeight: edge,
    quality: 0.8,
    format: "webp",
});
export const COMPRESS_PRESETS = {
    web: preset(1920),
    thumbnail: preset(512),
    avatar: preset(256),
};
/** Preset name → its options; custom options fill gaps with no size limit, q0.8, webp; no argument → `"web"`. */
export function resolveCompressOptions(options) {
    if (options === undefined)
        return COMPRESS_PRESETS.web;
    if (typeof options === "string")
        return COMPRESS_PRESETS[options];
    return {
        maxWidth: options.maxWidth ?? Infinity,
        maxHeight: options.maxHeight ?? Infinity,
        quality: Math.min(1, Math.max(0, options.quality ?? 0.8)),
        format: options.format ?? "webp",
    };
}
const RASTER = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/bmp"]);
const KEEP_ORIGINAL = new Set(["image/jpeg", "image/png", "image/webp"]);
const EXTENSIONS = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
/** Raster formats canvas can decode and re-encode; svg and gif (vector/animation) are excluded. */
export function isCompressible(file) {
    return RASTER.has(file.type.toLowerCase());
}
export async function decodeImage(file, signal) {
    throwIfAborted(signal);
    let bitmap;
    try {
        bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    }
    catch {
        throw new ImageProcessError("decode");
    }
    if (signal?.aborted || bitmap.width * bitmap.height > MAX_DECODE_PIXELS) {
        bitmap.close();
        throw new ImageProcessError(signal?.aborted ? "aborted" : "too-large");
    }
    return bitmap;
}
function createCanvas(width, height) {
    if (typeof OffscreenCanvas !== "undefined")
        return new OffscreenCanvas(width, height);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
}
async function encode(canvas, type, quality) {
    const blob = "convertToBlob" in canvas
        ? await canvas.convertToBlob({ type, quality }).catch(() => null)
        : await new Promise((resolve) => canvas.toBlob(resolve, type, quality));
    if (!blob)
        throw new ImageProcessError("encode");
    return blob;
}
function renameFile(name, type) {
    const dot = name.lastIndexOf(".");
    return `${dot > 0 ? name.slice(0, dot) : name}.${EXTENSIONS[type] ?? type.split("/")[1]}`;
}
/**
 * Draws `region` of `bitmap` scaled to fit `options`, encodes it and returns the new File.
 * With `keepIfLarger`, returns `file` when the result is not smaller and the source already fits.
 */
export async function renderImage(file, bitmap, region, options, keepIfLarger, signal) {
    let scale = Math.min(1, options.maxWidth / region.width, options.maxHeight / region.height);
    const pixels = region.width * region.height * scale * scale;
    if (pixels > MAX_CANVAS_PIXELS)
        scale *= Math.sqrt(MAX_CANVAS_PIXELS / pixels);
    const width = Math.max(1, Math.round(region.width * scale));
    const height = Math.max(1, Math.round(region.height * scale));
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");
    if (!ctx)
        throw new ImageProcessError("encode");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, region.x, region.y, region.width, region.height, 0, 0, width, height);
    const source = file.type.toLowerCase();
    const wanted = options.format === "original" ? (KEEP_ORIGINAL.has(source) ? source : "image/webp") : `image/${options.format}`;
    let blob = await encode(canvas, wanted, options.quality);
    throwIfAborted(signal);
    if (blob.type !== wanted) {
        // Encoder ignored the format (e.g. Safari without webp): jpeg for opaque sources, png otherwise.
        blob = await encode(canvas, source === "image/jpeg" ? "image/jpeg" : "image/png", options.quality);
        throwIfAborted(signal);
    }
    if (keepIfLarger && blob.size >= file.size && scale === 1)
        return file;
    return new File([blob], renameFile(file.name, blob.type), { type: blob.type, lastModified: file.lastModified });
}
/**
 * Downscales and re-encodes a raster image (EXIF orientation applied, metadata stripped).
 * Non-raster files (svg, gif, documents) are returned as the same instance; never upscales.
 */
export async function compressImage(file, options, init) {
    throwIfAborted(init?.signal);
    if (!isCompressible(file))
        return file;
    const bitmap = await decodeImage(file, init?.signal);
    try {
        const region = { x: 0, y: 0, width: bitmap.width, height: bitmap.height };
        return await renderImage(file, bitmap, region, resolveCompressOptions(options), true, init?.signal);
    }
    finally {
        bitmap.close();
    }
}
