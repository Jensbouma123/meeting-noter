/**
 * Contrast solver. Given a foreground and a background in OKLCH, walk the
 * foreground's lightness — and only its lightness — until the pair clears both
 * the WCAG 2.1 ratio and the APCA |Lc| target. Hue and chroma are held
 * constant so a solved colour still reads as the same colour.
 *
 * Lightness is the only free axis on purpose: moving hue breaks harmony, and
 * moving chroma desaturates brand colours out from under the caller. OKLCH
 * lightness is perceptually uniform, so the walk is monotonic in contrast for
 * a fixed hue/chroma and a coarse-scan-then-bisect search converges tightly.
 */
import { apcaLc, apcaLevel, contrastRatio, wcagLevel, } from "./contrast.js";
import { oklchToHex } from "./space.js";
const COARSE_SAMPLES = 101;
const BISECT_ITERATIONS = 24;
const LIGHTNESS_EPSILON = 1e-5;
const LARGE_TEXT_TARGET_RATIO = 3;
function clampLightness(l) {
    return Math.min(1, Math.max(0, l));
}
function contrastUseForTarget(target) {
    const tier = apcaLevel(target.lc);
    return tier === "invisible" ? "decorative" : tier;
}
function reportAgainst(fg, bg, target) {
    const ratio = contrastRatio(fg, bg);
    const lc = apcaLc(fg, bg);
    const wcagPasses = ratio >= target.ratio;
    const apcaPasses = Math.abs(lc) >= target.lc;
    return {
        foreground: fg,
        background: bg,
        use: contrastUseForTarget(target),
        wcag: {
            ratio,
            required: target.ratio,
            level: wcagLevel(ratio, target.ratio <= LARGE_TEXT_TARGET_RATIO),
            passes: wcagPasses,
        },
        apca: {
            lc,
            tier: apcaLevel(lc),
            required: target.lc,
            darkOnLight: lc > 0,
            passes: apcaPasses,
        },
        passes: wcagPasses && apcaPasses,
    };
}
/**
 * How far short of the target a pair falls, as the worse of the two engines'
 * achieved fractions. `>= 1` on both axes means the pair passes; below that,
 * a larger number is a nearer miss. Used only to pick the least-bad result
 * when no lightness on the axis can satisfy the target.
 */
function shortfallScore(report, target) {
    const ratioScore = target.ratio <= 0
        ? Number.POSITIVE_INFINITY
        : report.wcag.ratio / target.ratio;
    const lcScore = target.lc <= 0
        ? Number.POSITIVE_INFINITY
        : Math.abs(report.apca.lc) / target.lc;
    return Math.min(ratioScore, lcScore);
}
/**
 * Walk `fg`'s lightness until the pair clears `target` on both engines,
 * preferring the smallest lightness change that works so the solved colour
 * stays as close to the caller's intent as possible.
 *
 * `converged` is `false` when no lightness in [0, 1] satisfies the target —
 * the chroma is too high or the target too aggressive for this hue. The
 * returned colour is then the best pair found, and `report.passes` is `false`;
 * callers must not treat that as a pass.
 */
export function adjustForContrast(fg, bg, target) {
    const bgHex = oklchToHex(bg);
    const startL = clampLightness(fg.l);
    const at = (l) => {
        const color = { l, c: fg.c, h: fg.h };
        return { color, report: reportAgainst(oklchToHex(color), bgHex, target) };
    };
    const start = at(startL);
    if (start.report.passes) {
        return { color: start.color, report: start.report, converged: true };
    }
    let nearestPassL = null;
    let nearestPassDistance = Number.POSITIVE_INFINITY;
    let bestEffortL = startL;
    let bestEffortScore = shortfallScore(start.report, target);
    for (let i = 0; i < COARSE_SAMPLES; i += 1) {
        const l = i / (COARSE_SAMPLES - 1);
        const { report } = at(l);
        if (report.passes) {
            const distance = Math.abs(l - startL);
            if (distance < nearestPassDistance) {
                nearestPassDistance = distance;
                nearestPassL = l;
            }
            continue;
        }
        const score = shortfallScore(report, target);
        if (score > bestEffortScore) {
            bestEffortScore = score;
            bestEffortL = l;
        }
    }
    if (nearestPassL === null) {
        const fallback = at(bestEffortL);
        return { color: fallback.color, report: fallback.report, converged: false };
    }
    // Bisect between the nearest passing sample and the failing point just
    // inside it (the caller's own lightness, or the next sample toward it) to
    // recover the sub-sample-width minimal change.
    const coarseStep = 1 / (COARSE_SAMPLES - 1);
    const towardStart = Math.sign(startL - nearestPassL);
    let failing = towardStart === 0
        ? startL
        : clampLightness(nearestPassL + towardStart * coarseStep);
    if (Math.abs(failing - startL) > Math.abs(nearestPassL - startL)) {
        failing = startL;
    }
    let passing = nearestPassL;
    for (let i = 0; i < BISECT_ITERATIONS && Math.abs(passing - failing) > LIGHTNESS_EPSILON; i += 1) {
        const mid = (passing + failing) / 2;
        if (at(mid).report.passes) {
            passing = mid;
        }
        else {
            failing = mid;
        }
    }
    const solved = at(passing);
    return { color: solved.color, report: solved.report, converged: true };
}
