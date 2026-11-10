import type { HSLA, HSVA, RGBA } from "./types.js";
export declare function rgbToHsl({ r, g, b, a }: RGBA): HSLA;
export declare function hslToRgb({ h, s, l, a }: HSLA): RGBA;
export declare function rgbToHsv({ r, g, b, a }: RGBA): HSVA;
export declare function hsvToRgb({ h, s, v, a }: HSVA): RGBA;
