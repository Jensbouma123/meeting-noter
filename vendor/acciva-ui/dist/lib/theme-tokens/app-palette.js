import { buildRamp, buildSemanticRoles, buildTokenGraph, flattenDocument, harmonize, hexToOklch, } from "../color/index.js";
import { DEFAULT_HARMONY, } from "./constants.js";
import { resolveAliases, shadeScale } from "./aliases.js";
/**
 * Reads the graph's primitive ramps back out of the flattened document rather
 * than rebuilding them, so the JS values and the exported CSS can never drift.
 */
function primitiveScales(doc) {
    const scales = {};
    for (const token of flattenDocument(doc).primitive) {
        const palette = token.path[2];
        const step = token.path[3];
        if (palette === undefined || step === undefined)
            continue;
        const scale = scales[palette] ?? {};
        scale[Number(step)] = token.color;
        scales[palette] = scale;
    }
    return scales;
}
/**
 * The app carries three brand hues (60-30-10) but a harmony can hand back only
 * one partner. `accent` is the graph's own partner — the complement, or the
 * first rotation the mode defines — and `secondary` is the most-rotated
 * remaining variant, falling back to the +30 degree analogous neighbour when the
 * harmony has nothing else to give.
 */
function secondarySeedFor(seed, harmony) {
    const partners = harmonize(seed, harmony).slice(1);
    if (partners.length > 1)
        return partners[partners.length - 1];
    return (harmonize(seed, "analogous")[2] ?? seed);
}
/**
 * The expensive half of a theme: seven gamut-mapped ramps and both modes' role
 * tables. Independent of the active mode, so a light/dark toggle never rebuilds
 * it (`.agents/performance.md`).
 */
export function buildAppPalette(seed, harmony = DEFAULT_HARMONY) {
    const document = buildTokenGraph(seed, { harmony });
    const scales = primitiveScales(document);
    const rampSet = {
        brand: scales.brand,
        accent: scales.accent,
        neutral: scales.neutral,
        success: scales.success,
        warning: scales.warning,
        danger: scales.danger,
        info: scales.info,
    };
    const surface = scales.surface;
    const ramps = {
        primary: rampSet.brand,
        secondary: buildRamp(secondarySeedFor(hexToOklch(seed), harmony)),
        accent: rampSet.accent,
        neutral: rampSet.neutral,
        success: rampSet.success,
        warning: rampSet.warning,
        danger: rampSet.danger,
        info: rampSet.info,
    };
    const aliases = resolveAliases(ramps.primary);
    return {
        seed,
        harmony,
        document,
        ramps,
        aliases,
        scales: {
            primary: shadeScale(ramps.primary, aliases),
            secondary: shadeScale(ramps.secondary, aliases),
            accent: shadeScale(ramps.accent, aliases),
            neutral: shadeScale(ramps.neutral, aliases),
            success: shadeScale(ramps.success, aliases),
            warning: shadeScale(ramps.warning, aliases),
            danger: shadeScale(ramps.danger, aliases),
            info: shadeScale(ramps.info, aliases),
        },
        roles: {
            light: buildSemanticRoles(rampSet, "light", surface),
            dark: buildSemanticRoles(rampSet, "dark", surface),
        },
    };
}
