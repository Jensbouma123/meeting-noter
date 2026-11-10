import { TURF_RAMP_OVERRIDES } from "./turf-ramps.js";
import { TURF_SEMANTIC_OVERRIDES } from "./turf-semantic.js";
/**
 * Turf's five re-hued families are ramp stops, so they are mode-independent for
 * the same reason every generated ramp is: a tonal scale has no mode, only the
 * semantic roles that select from it do.
 */
const TURF_TOKEN_OVERRIDES = {
    light: { ...TURF_RAMP_OVERRIDES, ...TURF_SEMANTIC_OVERRIDES.light },
    dark: { ...TURF_RAMP_OVERRIDES, ...TURF_SEMANTIC_OVERRIDES.dark },
};
export const PRESET_PALETTES = [
    { name: "Ocean", seed: "#0ea5e9", harmony: "analogous" },
    { name: "Forest", seed: "#16a34a", harmony: "complementary" },
    { name: "Sunset", seed: "#f97316", harmony: "split-complementary" },
    { name: "Orchid", seed: "#a855f7", harmony: "triadic" },
    { name: "Crimson", seed: "#e11d48", harmony: "tetradic" },
    { name: "Slate", seed: "#475569", harmony: "monochromatic" },
    {
        // `primary`, `accent` and `neutral` are exactly what seed `#00a22b` under a
        // split-complementary harmony produces, so nothing overrides them. The other
        // five families are chosen hues, which the seed cannot reach: the engine
        // rotates one partner out of the seed and pins the four status hues to fixed
        // angles, and Turf separates every family by at least 17 degrees instead.
        name: "Turf",
        seed: "#00a22b",
        harmony: "split-complementary",
        radius: "md",
        tokenOverrides: TURF_TOKEN_OVERRIDES,
    },
];
