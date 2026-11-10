import { hexToOklch } from "../space/index.js";
import { buildSemanticRoles, buildSurfaceScale } from "../semantic/index.js";
import { buildRampSet, scaleToGroup } from "./primitives.js";
import { rolesToGroup } from "./semantic-groups.js";
import { componentGroup } from "./component-tokens.js";
const DEFAULT_PRECISION = 4;
export function isDtcgToken(node) {
    return "$value" in node;
}
/**
 * Builds the three-layer W3C DTCG 2025.10 graph for a seed colour: primitive
 * ramps hold literal `oklch()` values, semantic roles alias primitives per
 * mode, and component tokens alias semantic roles only.
 */
export function buildTokenGraph(seed, opts = {}) {
    const gamut = opts.gamut ?? "srgb";
    const harmony = opts.harmony ?? "complementary";
    const precision = opts.precision ?? DEFAULT_PRECISION;
    const seedOklch = hexToOklch(seed);
    const ramps = buildRampSet(seedOklch, gamut, harmony);
    const surface = buildSurfaceScale(seedOklch.h);
    const primitive = { surface: scaleToGroup(surface, "surface", precision) };
    for (const palette of Object.keys(ramps)) {
        primitive[palette] = scaleToGroup(ramps[palette], palette, precision);
    }
    return {
        $description: `OKLCH theme generated from seed ${seed} (${harmony} harmony, ${gamut} gamut)`,
        color: {
            primitive,
            semantic: {
                light: rolesToGroup(buildSemanticRoles(ramps, "light", surface)),
                dark: rolesToGroup(buildSemanticRoles(ramps, "dark", surface)),
            },
            component: {
                light: componentGroup("light"),
                dark: componentGroup("dark"),
            },
        },
    };
}
