export type ImageFormat = "webp" | "jpeg" | "png";
export interface CompressOptions {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    format?: ImageFormat | "original";
}
export type CompressPreset = "web" | "thumbnail" | "avatar";
export declare const COMPRESS_PRESETS: Readonly<Record<CompressPreset, Required<CompressOptions>>>;
/** Preset name → its options; custom options fill gaps with no size limit, q0.8, webp; no argument → `"web"`. */
export declare function resolveCompressOptions(options?: CompressPreset | CompressOptions): Required<CompressOptions>;
/** Raster formats canvas can decode and re-encode; svg and gif (vector/animation) are excluded. */
export declare function isCompressible(file: Blob): boolean;
export interface Region {
    x: number;
    y: number;
    width: number;
    height: number;
}
export declare function decodeImage(file: Blob, signal?: AbortSignal): Promise<ImageBitmap>;
/**
 * Draws `region` of `bitmap` scaled to fit `options`, encodes it and returns the new File.
 * With `keepIfLarger`, returns `file` when the result is not smaller and the source already fits.
 */
export declare function renderImage(file: File, bitmap: ImageBitmap, region: Region, options: Required<CompressOptions>, keepIfLarger: boolean, signal?: AbortSignal): Promise<File>;
/**
 * Downscales and re-encodes a raster image (EXIF orientation applied, metadata stripped).
 * Non-raster files (svg, gif, documents) are returned as the same instance; never upscales.
 */
export declare function compressImage(file: File, options?: CompressPreset | CompressOptions, init?: {
    signal?: AbortSignal;
}): Promise<File>;
