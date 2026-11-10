import { apcaLc } from "../contrast/index.js";
/**
 * `solved` is the step this mode will actually use — the shared step, or this
 * mode's own fallback. When nothing passes, the step is `null` and the numbers
 * come from `atIntent`, so the caller can still show how far short the
 * designer's own choice falls.
 */
export function measurement(mode, solved, atIntent) {
    const isLight = mode === "light";
    const reported = solved ?? atIntent;
    const bindingCtx = isLight ? reported.bindingLightContext : reported.bindingDarkContext;
    const background = isLight ? bindingCtx.lightBackground : bindingCtx.darkBackground;
    const ratio = isLight ? reported.minLightRatio : reported.minDarkRatio;
    const pass = isLight ? reported.passesLight : reported.passesDark;
    const step = solved === null ? null : solved.step;
    const hex = solved === null ? null : solved.hex;
    const reportedHex = reported.hex;
    return {
        mode,
        background,
        step,
        hex,
        ratio,
        pass,
        apcaLc: hex !== null ? apcaLc(hex, background) : apcaLc(reportedHex, background),
    };
}
export function unsolvedReason(lightSolvable, darkSolvable) {
    if (!lightSolvable && !darkSolvable)
        return "both-unsolvable";
    if (!lightSolvable)
        return "light-unsolvable";
    if (!darkSolvable)
        return "dark-unsolvable";
    return "no-shared-step";
}
export function emptyMeasurement(mode, background) {
    return { mode, background, step: null, hex: null, ratio: 1, pass: false, apcaLc: 0 };
}
