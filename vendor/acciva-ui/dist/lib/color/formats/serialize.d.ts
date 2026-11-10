import type { ColorFormat, RGBA } from "./types.js";
export declare function rgbaToHex(rgba: RGBA, alpha?: boolean): string;
export declare function formatColor(rgba: RGBA, format: ColorFormat, options?: {
    alpha?: boolean;
}): string;
