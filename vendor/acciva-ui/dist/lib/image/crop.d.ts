import { type CompressOptions, type CompressPreset, isCompressible } from "./compress.js";
/** Rectangle in oriented (EXIF-applied) source pixels. */
export interface CropRect {
    x: number;
    y: number;
    width: number;
    height: number;
}
/** `number` = width / height. */
export type CropAspect = "free" | "1:1" | "4:3" | "16:9" | "circle" | number;
/** Width / height for a locked aspect; `undefined` for `"free"` or an invalid number. */
export declare function aspectRatio(aspect: CropAspect): number | undefined;
/** Largest centred rect of the ratio, scaled to 80%; free = 80% × 80%. Integers. */
export declare function initialCropRect(width: number, height: number, aspect?: CropAspect): CropRect;
/** Fits `rect` inside the image, at least `minSize` per edge (capped to the image), at `aspect`. Integers. */
export declare function clampCropRect(rect: CropRect, width: number, height: number, aspect?: CropAspect, minSize?: number): CropRect;
/** Same set as `isCompressible`: raster images canvas can decode. */
export declare const isCroppable: typeof isCompressible;
/**
 * Crops `rect` out of `file` (EXIF orientation applied), then scales/encodes like `compressImage`.
 * Without `options` keeps the cropped size and source format at quality 0.92. Always returns a new File.
 */
export declare function cropImage(file: File, rect: CropRect, options?: CompressPreset | CompressOptions, init?: {
    signal?: AbortSignal;
}): Promise<File>;
