import { type ContrastReport, type Hex } from "../color/index.js";
export type AutoFixSeedResult = {
    readonly seed: Hex;
    readonly adjusted: boolean;
    readonly deltaE: number;
    readonly report: ContrastReport;
};
/**
 * Finds the nearest seed on the same hue and chroma line that clears the target
 * contrast against white action text (#ffffff). If the seed already passes, it is
 * returned unchanged with `adjusted: false` and `deltaE: 0`.
 */
export declare function autoFixSeedForContrast(seed: Hex, target?: "AA" | "AAA"): {
    seed: Hex;
    adjusted: boolean;
    deltaE: number;
    report: ContrastReport;
};
