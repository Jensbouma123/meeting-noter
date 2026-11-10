/**
 * Parabolic falloff around the hue's saturation lightness, clamped at zero.
 * Constant chroma down a ramp asks for colours that do not exist at the
 * extremes, and gamut mapping then flattens them all to the same value.
 */
export declare function chromaCurve(l: number, cMax: number, lPeak: number, sigma: number): number;
/**
 * Width that leaves the far end of the ramp at ~8% of peak chroma, so a
 * dark-peaking hue still gets pale tints and a light-peaking one still gets
 * chromatic shades.
 */
export declare function sigmaForPeak(lPeak: number): number;
