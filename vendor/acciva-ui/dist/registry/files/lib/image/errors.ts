export type ImageProcessErrorCode = "unsupported" | "decode" | "encode" | "too-large" | "rect" | "aborted";

export class ImageProcessError extends Error {
  readonly code: ImageProcessErrorCode;

  constructor(code: ImageProcessErrorCode, message: string = code) {
    super(message);
    this.name = "ImageProcessError";
    this.code = code;
  }
}

/** Source cap: larger decoded images are rejected with `"too-large"`. */
export const MAX_DECODE_PIXELS = 50_000_000;
/** iOS canvas limit; output is scaled down to fit. */
export const MAX_CANVAS_PIXELS = 16_777_216;

export function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new ImageProcessError("aborted");
}
