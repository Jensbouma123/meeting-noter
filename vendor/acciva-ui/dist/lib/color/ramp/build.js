import { gamutMap } from "../gamut.js";
import { CHROMA_EPSILON, normalizeHue } from "../space/index.js";
import { maxChromaForHue, peakLightnessForHue } from "./hueAnchors.js";
import { chromaCurve, sigmaForPeak } from "./curve.js";
import { RAMP_STEPS } from "./steps.js";
/**
 * The seed's 26-step tonal ramp. Lightness is fixed by the step label; chroma
 * follows the hue's curve, scaled so the ramp passes through the seed — a muted
 * seed yields a muted ramp instead of every seed of a hue collapsing onto one
 * palette. Every step is gamut-mapped, so all 26 are guaranteed renderable.
 */
export function buildRamp(seed, gamut = "srgb") {
    const h = normalizeHue(seed.h);
    const ramp = {};
    if (seed.c < CHROMA_EPSILON) {
        for (const step of RAMP_STEPS)
            ramp[step] = { l: step / 1000, c: 0, h };
        return ramp;
    }
    const lPeak = peakLightnessForHue(h);
    const sigma = sigmaForPeak(lPeak);
    const cMax = maxChromaForHue(h);
    const atSeed = chromaCurve(seed.l, cMax, lPeak, sigma);
    const scale = atSeed > 0 ? Math.min(1, seed.c / atSeed) : 1;
    for (const step of RAMP_STEPS) {
        const l = step / 1000;
        ramp[step] = gamutMap({ l, c: chromaCurve(l, cMax * scale, lPeak, sigma), h }, gamut);
    }
    return ramp;
}
