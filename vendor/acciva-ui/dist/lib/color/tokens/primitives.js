import { formatOklch } from "../space/index.js";
import { harmonize } from "../harmony.js";
import { buildRamp } from "../ramp/index.js";
const STATUS_HUES = {
    success: 145,
    warning: 85,
    danger: 27,
    info: 240,
};
const STATUS_SEED_L = 0.55;
const STATUS_SEED_C = 0.16;
const NEUTRAL_MAX_CHROMA = 0.012;
export function desaturate(ramp, maxChroma) {
    const out = {};
    for (const key of Object.keys(ramp)) {
        const step = Number(key);
        const color = ramp[step];
        out[step] = { ...color, c: Math.min(color.c, maxChroma) };
    }
    return out;
}
export function harmonyPartner(seed, mode) {
    const candidates = harmonize(seed, mode);
    const rotated = candidates.find((candidate) => Math.abs(((candidate.h - seed.h) % 360 + 360) % 360) > 1);
    return rotated ?? candidates[candidates.length - 1] ?? seed;
}
export function scaleToGroup(scale, name, precision) {
    const group = {};
    for (const key of Object.keys(scale)) {
        const step = Number(key);
        group[String(step)] = {
            $value: formatOklch(scale[step], { precision }),
            $type: "color",
            $description: `${name} scale step ${step}`,
        };
    }
    return group;
}
export function buildRampSet(seed, gamut, harmony) {
    const accentSeed = harmonyPartner(seed, harmony);
    return {
        brand: buildRamp(seed, gamut),
        accent: buildRamp(accentSeed, gamut),
        neutral: desaturate(buildRamp({ l: seed.l, c: NEUTRAL_MAX_CHROMA, h: seed.h }, gamut), NEUTRAL_MAX_CHROMA),
        success: buildRamp({ l: STATUS_SEED_L, c: STATUS_SEED_C, h: STATUS_HUES.success }, gamut),
        warning: buildRamp({ l: STATUS_SEED_L, c: STATUS_SEED_C, h: STATUS_HUES.warning }, gamut),
        danger: buildRamp({ l: STATUS_SEED_L, c: STATUS_SEED_C, h: STATUS_HUES.danger }, gamut),
        info: buildRamp({ l: STATUS_SEED_L, c: STATUS_SEED_C, h: STATUS_HUES.info }, gamut),
    };
}
