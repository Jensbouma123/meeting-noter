export type RGBA = {
    r: number;
    g: number;
    b: number;
    a: number;
};
export type HSLA = {
    h: number;
    s: number;
    l: number;
    a: number;
};
export type HSVA = {
    h: number;
    s: number;
    v: number;
    a: number;
};
export type ColorFormat = "hex" | "rgb" | "hsl";
/** Strict CSS colour parser: `#hex` (3/4/6/8), `rgb[a]()`, `hsl[a]()`, `oklch()`. Returns `null` on anything else and never throws. */
export declare function parseColor(input: unknown): RGBA | null;
export declare function rgbToHsl({ r, g, b, a }: RGBA): HSLA;
export declare function hslToRgb({ h, s, l, a }: HSLA): RGBA;
export declare function rgbToHsv({ r, g, b, a }: RGBA): HSVA;
export declare function hsvToRgb({ h, s, v, a }: HSVA): RGBA;
export declare function rgbaToHex(rgba: RGBA, alpha?: boolean): string;
export declare function formatColor(rgba: RGBA, format: ColorFormat, options?: {
    alpha?: boolean;
}): string;
