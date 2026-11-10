import type { Gamut } from "../types.js";
type Matrix3 = readonly [
    readonly [number, number, number],
    readonly [number, number, number],
    readonly [number, number, number]
];
/**
 * Exact rational CSS Color 4 primaries expanded to double precision. The
 * truncated 7-digit constants in wide circulation lose ~1e-6 per round trip.
 */
export declare const LINEAR_RGB_TO_XYZ: Record<Gamut, Matrix3>;
export declare const XYZ_TO_LINEAR_RGB: Record<Gamut, Matrix3>;
export declare const XYZ_TO_LMS: Matrix3;
export declare const LMS_TO_XYZ: Matrix3;
export declare const LMS_TO_OKLAB: Matrix3;
export declare const OKLAB_TO_LMS: Matrix3;
export declare function apply(m: Matrix3, x: number, y: number, z: number): [number, number, number];
export {};
