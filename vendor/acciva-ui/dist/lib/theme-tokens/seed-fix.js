import { APCA_THRESHOLDS, apcaLc, apcaLevel, contrastRatio, gamutMap, hexToOklch, oklchToHex, oklchToOklab, wcagLevel, } from "../color/index.js";
import { ACTION_LABEL } from "./constants.js";
/** Perceptual distance in OKLab — the space the whole engine already works in. */
function deltaEOk(a, b) {
    const left = oklchToOklab(a);
    const right = oklchToOklab(b);
    return Math.hypot(left.l - right.l, left.a - right.a, left.b - right.b);
}
const SUGGESTION_SAMPLES = 101;
/** Evaluates action contrast of white label (#ffffff) on candidate seed fill. */
function evaluateActionSeed(seed, target) {
    const targetRatio = target === "AAA" ? 7.0 : 4.5;
    const targetLc = target === "AAA" ? APCA_THRESHOLDS["body-preferred"] : APCA_THRESHOLDS.body;
    const ratio = contrastRatio(ACTION_LABEL, seed);
    const lc = apcaLc(ACTION_LABEL, seed);
    const wcagPasses = ratio >= targetRatio;
    const apcaPasses = Math.abs(lc) >= targetLc;
    return {
        foreground: ACTION_LABEL,
        background: seed,
        use: target === "AAA" ? "body-preferred" : "body",
        wcag: {
            ratio,
            required: targetRatio,
            level: wcagLevel(ratio),
            passes: wcagPasses,
        },
        apca: {
            lc,
            tier: apcaLevel(lc),
            required: targetLc,
            darkOnLight: lc > 0,
            passes: apcaPasses,
        },
        passes: wcagPasses && apcaPasses,
    };
}
/**
 * Finds the nearest seed on the same hue and chroma line that clears the target
 * contrast against white action text (#ffffff). If the seed already passes, it is
 * returned unchanged with `adjusted: false` and `deltaE: 0`.
 */
export function autoFixSeedForContrast(seed, target = "AA") {
    const origin = hexToOklch(seed);
    const initialReport = evaluateActionSeed(seed, target);
    if (initialReport.passes) {
        return {
            seed,
            adjusted: false,
            deltaE: 0,
            report: initialReport,
        };
    }
    let best = null;
    for (let sample = 0; sample < SUGGESTION_SAMPLES; sample += 1) {
        const raw = { l: sample / (SUGGESTION_SAMPLES - 1), c: origin.c, h: origin.h };
        const candidate = gamutMap(raw, "srgb");
        const hex = oklchToHex(candidate);
        const rep = evaluateActionSeed(hex, target);
        if (!rep.passes)
            continue;
        const distance = deltaEOk(origin, hexToOklch(hex));
        if (best === null || distance < best.deltaE) {
            best = { hex, deltaE: distance, report: rep };
        }
    }
    if (best === null) {
        return {
            seed,
            adjusted: false,
            deltaE: 0,
            report: initialReport,
        };
    }
    return {
        seed: best.hex,
        adjusted: true,
        deltaE: Math.round(best.deltaE * 1000) / 1000,
        report: best.report,
    };
}
