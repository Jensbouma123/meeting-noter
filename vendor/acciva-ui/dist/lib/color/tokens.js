import { formatOklch, hexToOklch } from "./space.js";
import { harmonize } from "./harmony.js";
import { buildRamp } from "./ramp.js";
import { buildSemanticRoles, buildSurfaceScale, } from "./semantic.js";
const STATUS_HUES = {
    success: 145,
    warning: 85,
    danger: 27,
    info: 240,
};
const STATUS_SEED_L = 0.55;
const STATUS_SEED_C = 0.16;
const NEUTRAL_MAX_CHROMA = 0.012;
const DEFAULT_PRECISION = 4;
export function isDtcgToken(node) {
    return "$value" in node;
}
function desaturate(ramp, maxChroma) {
    const out = {};
    for (const key of Object.keys(ramp)) {
        const step = Number(key);
        const color = ramp[step];
        out[step] = Object.assign(Object.assign({}, color), { c: Math.min(color.c, maxChroma) });
    }
    return out;
}
function harmonyPartner(seed, mode) {
    var _a;
    const candidates = harmonize(seed, mode);
    const rotated = candidates.find((candidate) => Math.abs(((candidate.h - seed.h) % 360 + 360) % 360) > 1);
    return (_a = rotated !== null && rotated !== void 0 ? rotated : candidates[candidates.length - 1]) !== null && _a !== void 0 ? _a : seed;
}
function scaleToGroup(scale, name, precision) {
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
function roleToToken(semanticRole) {
    return {
        $value: semanticRole.$value,
        $type: "color",
        $description: semanticRole.$description,
    };
}
function rolesToGroup(roles) {
    const group = {};
    for (const [groupName, members] of Object.entries(roles)) {
        const entries = {};
        for (const [roleName, semanticRole] of Object.entries(members)) {
            entries[roleName] = roleToToken(semanticRole);
        }
        group[groupName] = entries;
    }
    return group;
}
const COMPONENT_TOKENS = [
    { path: ["button", "primary", "background"], group: "accent", role: "brand", $description: "Primary button fill" },
    { path: ["button", "primary", "backgroundHover"], group: "accent", role: "brandHover", $description: "Primary button fill, hovered" },
    { path: ["button", "primary", "backgroundActive"], group: "accent", role: "brandActive", $description: "Primary button fill, pressed" },
    { path: ["button", "primary", "foreground"], group: "accent", role: "onBrand", $description: "Primary button label" },
    { path: ["button", "primary", "border"], group: "accent", role: "brand", $description: "Primary button border" },
    { path: ["button", "secondary", "background"], group: "background", role: "surface", $description: "Secondary button fill" },
    { path: ["button", "secondary", "foreground"], group: "foreground", role: "primary", $description: "Secondary button label" },
    { path: ["button", "secondary", "border"], group: "border", role: "default", $description: "Secondary button border" },
    { path: ["button", "ghost", "foreground"], group: "accent", role: "brand", $description: "Ghost button label" },
    { path: ["button", "ghost", "backgroundHover"], group: "accent", role: "brandSubtle", $description: "Ghost button hover wash" },
    { path: ["button", "disabled", "background"], group: "background", role: "surface", $description: "Disabled button fill" },
    { path: ["button", "disabled", "foreground"], group: "foreground", role: "disabled", $description: "Disabled button label" },
    { path: ["input", "background"], group: "background", role: "surface", $description: "Text field fill" },
    { path: ["input", "foreground"], group: "foreground", role: "primary", $description: "Text field value" },
    { path: ["input", "placeholder"], group: "foreground", role: "muted", $description: "Text field placeholder" },
    { path: ["input", "border"], group: "border", role: "default", $description: "Text field border" },
    { path: ["input", "borderFocus"], group: "border", role: "focus", $description: "Text field focus indicator" },
    { path: ["input", "borderError"], group: "status", role: "dangerBorder", $description: "Text field border in an error state" },
    { path: ["card", "background"], group: "background", role: "surface", $description: "Card fill" },
    { path: ["card", "border"], group: "border", role: "subtle", $description: "Card border" },
    { path: ["card", "foreground"], group: "foreground", role: "primary", $description: "Card text" },
    { path: ["dialog", "background"], group: "background", role: "dialog", $description: "Dialog fill" },
    { path: ["dialog", "border"], group: "border", role: "subtle", $description: "Dialog border" },
    { path: ["dialog", "foreground"], group: "foreground", role: "primary", $description: "Dialog text" },
    { path: ["tooltip", "background"], group: "background", role: "inverse", $description: "Tooltip fill" },
    { path: ["tooltip", "foreground"], group: "foreground", role: "onInverse", $description: "Tooltip text" },
    { path: ["badge", "success", "background"], group: "status", role: "successSubtle", $description: "Success badge fill" },
    { path: ["badge", "success", "foreground"], group: "status", role: "success", $description: "Success badge label" },
    { path: ["badge", "success", "border"], group: "status", role: "successBorder", $description: "Success badge border" },
    { path: ["badge", "warning", "background"], group: "status", role: "warningSubtle", $description: "Warning badge fill" },
    { path: ["badge", "warning", "foreground"], group: "status", role: "warning", $description: "Warning badge label" },
    { path: ["badge", "warning", "border"], group: "status", role: "warningBorder", $description: "Warning badge border" },
    { path: ["badge", "danger", "background"], group: "status", role: "dangerSubtle", $description: "Danger badge fill" },
    { path: ["badge", "danger", "foreground"], group: "status", role: "danger", $description: "Danger badge label" },
    { path: ["badge", "danger", "border"], group: "status", role: "dangerBorder", $description: "Danger badge border" },
    { path: ["badge", "info", "background"], group: "status", role: "infoSubtle", $description: "Info badge fill" },
    { path: ["badge", "info", "foreground"], group: "status", role: "info", $description: "Info badge label" },
    { path: ["badge", "info", "border"], group: "status", role: "infoBorder", $description: "Info badge border" },
    { path: ["link", "foreground"], group: "accent", role: "brand", $description: "Inline link" },
    { path: ["link", "foregroundHover"], group: "accent", role: "brandHover", $description: "Inline link, hovered" },
    { path: ["focusRing", "color"], group: "border", role: "focus", $description: "Focus ring colour (WCAG 2.2 SC 2.4.11)" },
    { path: ["surface", "canvas"], group: "background", role: "canvas", $description: "Page canvas" },
    { path: ["surface", "raised"], group: "background", role: "raised", $description: "Raised surface" },
    { path: ["surface", "overlay"], group: "background", role: "overlay", $description: "Overlay surface" },
];
function componentGroup(mode) {
    var _a;
    const root = {};
    for (const spec of COMPONENT_TOKENS) {
        let cursor = root;
        for (const segment of spec.path.slice(0, -1)) {
            const next = (_a = cursor[segment]) !== null && _a !== void 0 ? _a : {};
            cursor[segment] = next;
            cursor = next;
        }
        const leaf = spec.path[spec.path.length - 1];
        cursor[leaf] = {
            $value: `{color.semantic.${mode}.${spec.group}.${spec.role}}`,
            $type: "color",
            $description: spec.$description,
        };
    }
    return root;
}
function buildRampSet(seed, gamut, harmony) {
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
/**
 * Builds the three-layer W3C DTCG 2025.10 graph for a seed colour: primitive
 * ramps hold literal `oklch()` values, semantic roles alias primitives per
 * mode, and component tokens alias semantic roles only.
 */
export function buildTokenGraph(seed, opts = {}) {
    var _a, _b, _c;
    const gamut = (_a = opts.gamut) !== null && _a !== void 0 ? _a : "srgb";
    const harmony = (_b = opts.harmony) !== null && _b !== void 0 ? _b : "complementary";
    const precision = (_c = opts.precision) !== null && _c !== void 0 ? _c : DEFAULT_PRECISION;
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
