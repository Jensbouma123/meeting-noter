export type ImageProcessErrorCode = "unsupported" | "decode" | "encode" | "too-large" | "rect" | "aborted";
export declare class ImageProcessError extends Error {
    readonly code: ImageProcessErrorCode;
    constructor(code: ImageProcessErrorCode, message?: string);
}
/** Source cap: larger decoded images are rejected with `"too-large"`. */
export declare const MAX_DECODE_PIXELS = 50000000;
/** iOS canvas limit; output is scaled down to fit. */
export declare const MAX_CANVAS_PIXELS = 16777216;
export declare function throwIfAborted(signal?: AbortSignal): void;
