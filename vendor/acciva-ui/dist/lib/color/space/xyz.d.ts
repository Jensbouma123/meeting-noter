import type { Gamut, LinearRGB, OKLab, XYZ } from "../types.js";
export declare function linearRgbToXyz(rgb: LinearRGB, gamut?: Gamut): XYZ;
export declare function xyzToLinearRgb(xyz: XYZ, gamut?: Gamut): LinearRGB;
export declare function xyzToOklab(xyz: XYZ): OKLab;
export declare function oklabToXyz(lab: OKLab): XYZ;
