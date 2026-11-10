/**
 * Dual-mode constraint solver.
 *
 * A role has one designer intent but two contexts: it renders on the light
 * background in light mode and on the dark background in dark mode. This walks
 * the role's own ramp for the step nearest that intent which clears WCAG 2.2 AA
 * against **both** backgrounds, and reports honestly when no single step can.
 *
 * **WCAG ratio only.** `adjustForContrast` in `solve.ts` is deliberately not
 * reused here: it ANDs the WCAG ratio with an APCA |Lc| target, so it rejects
 * steps that conform to WCAG 2.2 AA and would make the gate stricter than the
 * standard. APCA is reported per mode as advisory context and never decides
 * `converged`.
 *
 * Only ramp steps are considered, not arbitrary lightnesses. The ramp is the
 * theme's vocabulary: a solved colour that is not a step cannot be aliased by a
 * token, so it would leak a literal into the graph.
 */
import { apcaLc, contrastRatio, WCAG_THRESHOLDS } from "./contrast.js";
import { RAMP_STEPS } from "./ramp.js";
import { oklchToHex } from "./space.js";
/**
 * The ramp's own steps, ascending in lightness. Read off the ramp rather than
 * from `RAMP_STEPS` so an elevation `SurfaceScale` — whose keys are the
 * elevation ladders, not ramp steps — solves the same way.
 */
function stepsOf(ramp) {
    return Object.keys(ramp)
        .map((key) => Number(key))
        .filter((step) => Number.isFinite(step))
        .sort((a, b) => a - b);
}
/**
 * The canonical ramp step closest to a raw OKLCH lightness. Callers holding a
 * designer's lightness rather than a step label use this to name their intent.
 */
export function nearestRampStep(lightness) {
    const target = lightness * 1000;
    let best = RAMP_STEPS[0];
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const step of RAMP_STEPS) {
        const distance = Math.abs(step - target);
        if (distance < bestDistance) {
            bestDistance = distance;
            best = step;
        }
    }
    return best;
}
function intentIndex(steps, intent) {
    let best = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (let i = 0; i < steps.length; i += 1) {
        const distance = Math.abs(steps[i] - intent);
        if (distance < bestDistance) {
            bestDistance = distance;
            best = i;
        }
    }
    return best;
}
/**
 * Nearest to the intent wins. Ties — the intent sitting exactly between two
 * qualifying steps — go to the larger minimum ratio, so the tie-break spends
 * the free choice on headroom rather than on ramp direction.
 */
function pickNearest(candidates, anchor, headroom) {
    let best = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    let bestHeadroom = Number.NEGATIVE_INFINITY;
    for (const candidate of candidates) {
        const distance = Math.abs(candidate.index - anchor);
        const candidateHeadroom = headroom(candidate);
        if (distance < bestDistance ||
            (distance === bestDistance && candidateHeadroom > bestHeadroom)) {
            best = candidate;
            bestDistance = distance;
            bestHeadroom = candidateHeadroom;
        }
    }
    return best;
}
/**
 * `solved` is the step this mode will actually use — the shared step, or this
 * mode's own fallback. When nothing passes, the step is `null` and the numbers
 * come from `atIntent`, so the caller can still show how far short the
 * designer's own choice falls.
 */
function measurement(mode, solved, atIntent) {
    const isLight = mode === "light";
    const reported = solved !== null && solved !== void 0 ? solved : atIntent;
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
function unsolvedReason(lightSolvable, darkSolvable) {
    if (!lightSolvable && !darkSolvable)
        return "both-unsolvable";
    if (!lightSolvable)
        return "light-unsolvable";
    if (!darkSolvable)
        return "dark-unsolvable";
    return "no-shared-step";
}
function emptyMeasurement(mode, background) {
    return { mode, background, step: null, hex: null, ratio: 1, pass: false, apcaLc: 0 };
}
/**
 * Solve one role across all of its contexts for both modes at once.
 *
 * Walks the role's ramp for the step nearest `intent` whose colour clears WCAG 2.2
 * AA against every context in light mode and every context in dark mode.
 */
export function solveMultiContextDualMode(request) {
    var _a, _b, _c;
    const { ramp, intent, contexts, use } = request;
    const required = WCAG_THRESHOLDS[use];
    const steps = stepsOf(ramp);
    const fallbackContext = (_a = contexts[0]) !== null && _a !== void 0 ? _a : {
        lightBackground: "#ffffff",
        darkBackground: "#000000",
        use,
    };
    if (steps.length === 0 || contexts.length === 0) {
        return {
            converged: false,
            step: null,
            color: null,
            hex: null,
            use,
            required,
            intent,
            intentDistance: null,
            light: emptyMeasurement("light", fallbackContext.lightBackground),
            dark: emptyMeasurement("dark", fallbackContext.darkBackground),
            lightStep: null,
            darkStep: null,
            reason: steps.length === 0 ? "empty-ramp" : "both-unsolvable",
            stepsClearingBoth: [],
        };
    }
    const anchor = intentIndex(steps, intent);
    const candidates = steps.map((step, index) => {
        var _a;
        const color = ramp[step];
        const hex = oklchToHex(color);
        let minLightRatio = Number.POSITIVE_INFINITY;
        let minDarkRatio = Number.POSITIVE_INFINITY;
        let bindingLightContext = fallbackContext;
        let bindingDarkContext = fallbackContext;
        let passesLight = true;
        let passesDark = true;
        for (const context of contexts) {
            const targetRatio = WCAG_THRESHOLDS[(_a = context.use) !== null && _a !== void 0 ? _a : use];
            const lightRatio = contrastRatio(hex, context.lightBackground);
            const darkRatio = contrastRatio(hex, context.darkBackground);
            if (lightRatio < minLightRatio) {
                minLightRatio = lightRatio;
                bindingLightContext = context;
            }
            if (darkRatio < minDarkRatio) {
                minDarkRatio = darkRatio;
                bindingDarkContext = context;
            }
            if (lightRatio < targetRatio)
                passesLight = false;
            if (darkRatio < targetRatio)
                passesDark = false;
        }
        return {
            step,
            index,
            color,
            hex,
            minLightRatio,
            minDarkRatio,
            bindingLightContext,
            bindingDarkContext,
            passesLight,
            passesDark,
        };
    });
    const clearingBoth = candidates.filter((candidate) => candidate.passesLight && candidate.passesDark);
    const shared = pickNearest(clearingBoth, anchor, (candidate) => Math.min(candidate.minLightRatio, candidate.minDarkRatio));
    const lightOnly = pickNearest(candidates.filter((candidate) => candidate.passesLight), anchor, (candidate) => candidate.minLightRatio);
    const darkOnly = pickNearest(candidates.filter((candidate) => candidate.passesDark), anchor, (candidate) => candidate.minDarkRatio);
    const atIntent = candidates[anchor];
    const light = measurement("light", shared !== null && shared !== void 0 ? shared : lightOnly, atIntent);
    const dark = measurement("dark", shared !== null && shared !== void 0 ? shared : darkOnly, atIntent);
    if (shared === null) {
        return {
            converged: false,
            step: null,
            color: null,
            hex: null,
            use,
            required,
            intent,
            intentDistance: null,
            light,
            dark,
            lightStep: (_b = lightOnly === null || lightOnly === void 0 ? void 0 : lightOnly.step) !== null && _b !== void 0 ? _b : null,
            darkStep: (_c = darkOnly === null || darkOnly === void 0 ? void 0 : darkOnly.step) !== null && _c !== void 0 ? _c : null,
            reason: unsolvedReason(lightOnly !== null, darkOnly !== null),
            stepsClearingBoth: [],
        };
    }
    return {
        converged: true,
        step: shared.step,
        color: shared.color,
        hex: shared.hex,
        use,
        required,
        intent,
        intentDistance: Math.abs(shared.index - anchor),
        light,
        dark,
        lightStep: shared.step,
        darkStep: shared.step,
        reason: null,
        stepsClearingBoth: clearingBoth.map((candidate) => candidate.step),
    };
}
/**
 * Solve one role for both modes at once against a single context pair.
 */
export function solveDualMode(request) {
    return solveMultiContextDualMode({
        ramp: request.ramp,
        intent: request.intent,
        use: request.use,
        contexts: [
            {
                lightBackground: request.lightBackground,
                darkBackground: request.darkBackground,
                use: request.use,
            },
        ],
    });
}
