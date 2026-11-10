export class ImageProcessError extends Error {
    constructor(code, message = code) {
        super(message);
        this.name = "ImageProcessError";
        this.code = code;
    }
}
/** Source cap: larger decoded images are rejected with `"too-large"`. */
export const MAX_DECODE_PIXELS = 50000000;
/** iOS canvas limit; output is scaled down to fit. */
export const MAX_CANVAS_PIXELS = 16777216;
export function throwIfAborted(signal) {
    if (signal === null || signal === void 0 ? void 0 : signal.aborted)
        throw new ImageProcessError("aborted");
}
