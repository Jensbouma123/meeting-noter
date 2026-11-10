/**
 * The app's view of the OKLCH engine.
 *
 * `@/lib/color` models a theme as brand / accent / neutral / status ramps of 26
 * steps plus semantic roles per mode. This app's components were written
 * against Tailwind-shaped `primary` / `secondary` / `accent` / `neutral` scales
 * and a flat `--background` / `--surface` / `--foreground` property set, so this
 * module is the single place that speaks both vocabularies. It is pure — no
 * React, no DOM — and is the only thing `theme-context.tsx` and the tokens.css
 * generator need to import.
 */
import { APCA_THRESHOLDS, RAMP_STEPS, TAILWIND_ALIASES, apcaLc, apcaLevel, buildRamp, buildSemanticRoles, buildTokenGraph, contrastRatio, evaluatePair, flattenDocument, formatOklch, gamutMap, harmonize, hexToOklch, oklchToHex, oklchToOklab, wcagLevel, } from "../lib/color/index.js";
export const APP_PALETTES = ["primary", "secondary", "accent", "neutral"];
/** Tailwind's stop names, lightest first. The app's public palette surface. */
export const TAILWIND_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
export const HARMONY_MODES = [
    "complementary",
    "analogous",
    "triadic",
    "split-complementary",
    "tetradic",
    "monochromatic",
];
export const DEFAULT_SEED = "#00835b";
export const DEFAULT_HARMONY = "complementary";
export const RADIUS_MAP = {
    none: { rem: "0rem", label: "Sharp", px: "0px" },
    xs: { rem: "0.25rem", label: "XS", px: "4px" },
    sm: { rem: "0.375rem", label: "SM", px: "6px" },
    md: { rem: "0.5rem", label: "MD (Default)", px: "8px" },
    lg: { rem: "0.75rem", label: "LG", px: "12px" },
    xl: { rem: "1.0rem", label: "XL", px: "16px" },
    "2xl": { rem: "1.5rem", label: "2XL", px: "24px" },
    full: { rem: "9999px", label: "Pill / Full", px: "9999px" },
};
export const DEFAULT_RADIUS = "md";
/** The single length every `rounded-*` utility is a multiple of. */
export const RADIUS_BASE_VARIABLE = "--radius-base";
/**
 * Tailwind's own radius namespace, re-expressed as multiples of the base so the
 * whole scale moves together when the base does. At the default `md` base
 * (0.5rem) every step lands on the exact value Tailwind ships, so re-deriving
 * the scale is invisible until the user actually moves it. `--radius` is the
 * bare `rounded` utility; `rounded-full` stays a pill and is not on the scale.
 */
export const RADIUS_STEP_RATIOS = [
    ["--radius", 0.5],
    ["--radius-xs", 0.25],
    ["--radius-sm", 0.5],
    ["--radius-md", 0.75],
    ["--radius-lg", 1],
    ["--radius-xl", 1.5],
    ["--radius-2xl", 2],
    ["--radius-3xl", 3],
    ["--radius-4xl", 4],
];
export function radiusVariables() {
    return RADIUS_STEP_RATIOS.map(([name, ratio]) => ({
        name,
        value: ratio === 1
            ? `var(${RADIUS_BASE_VARIABLE})`
            : `calc(var(${RADIUS_BASE_VARIABLE}) * ${ratio})`,
    }));
}
const TURF_RAMP_OVERRIDES = {
    "--color-secondary-50": "#fff7f1",
    "--color-secondary-100": "#ffe6d5",
    "--color-secondary-200": "#ffcba9",
    "--color-secondary-300": "#ffaf77",
    "--color-secondary-400": "#ed7c00",
    "--color-secondary-500": "#a75600",
    "--color-secondary-600": "#974c00",
    "--color-secondary-700": "#864300",
    "--color-secondary-800": "#763b00",
    "--color-secondary-900": "#673200",
    "--color-secondary-950": "#3b1a00",
    "--color-success-50": "#e8fff3",
    "--color-success-100": "#b3ffd9",
    "--color-success-200": "#58f8b6",
    "--color-success-300": "#3de4a3",
    "--color-success-400": "#00bb80",
    "--color-success-500": "#008359",
    "--color-success-600": "#00764f",
    "--color-success-700": "#006946",
    "--color-success-800": "#005c3d",
    "--color-success-900": "#005034",
    "--color-success-950": "#002c1b",
    "--color-warning-50": "#fff8ea",
    "--color-warning-100": "#ffe8bf",
    "--color-warning-200": "#ffd075",
    "--color-warning-300": "#f8b815",
    "--color-warning-400": "#ca9400",
    "--color-warning-500": "#8e6700",
    "--color-warning-600": "#805c00",
    "--color-warning-700": "#725200",
    "--color-warning-800": "#644800",
    "--color-warning-900": "#573d00",
    "--color-warning-950": "#312100",
    "--color-danger-50": "#fff6f5",
    "--color-danger-100": "#ffe4e1",
    "--color-danger-200": "#ffc8c2",
    "--color-danger-300": "#ffaba3",
    "--color-danger-400": "#ff635e",
    "--color-danger-500": "#ca202a",
    "--color-danger-600": "#ba0d1f",
    "--color-danger-700": "#a80018",
    "--color-danger-800": "#940014",
    "--color-danger-900": "#810010",
    "--color-danger-950": "#4b0005",
    "--color-info-50": "#f3f9ff",
    "--color-info-100": "#daeeff",
    "--color-info-200": "#b4ddff",
    "--color-info-300": "#8eccfc",
    "--color-info-400": "#47a7eb",
    "--color-info-500": "#0075b4",
    "--color-info-600": "#0069a2",
    "--color-info-700": "#005d91",
    "--color-info-800": "#005280",
    "--color-info-900": "#00466f",
    "--color-info-950": "#002640",
};
/**
 * Every role Turf chooses for itself. `--focus-ring-offset` is the one role
 * graded from both sides at once — against each action fill and against the
 * outer ring — so a pinned value can only be right for the fills it was measured
 * against. Light mode's `#f4f9f5` was measured against fills that still hold, so
 * it stands; dark mode has no value that satisfies both sides and omits the key,
 * which hands the role to the solver (`#0d110d`).
 */
const TURF_SEMANTIC_OVERRIDES = {
    light: {
        "--background": "#edf2ed",
        "--surface": "#f4f9f5",
        "--elevation-0": "#edf2ed",
        "--elevation-1": "#f4f9f5",
        "--elevation-2": "#f9fefa",
        "--elevation-3": "#fbfffc",
        "--elevation-4": "#fcfffc",
        "--foreground": "#121512",
        "--surface-foreground": "#121512",
        "--muted-foreground": "#4b4e4b",
        "--subtle-foreground": "#676a67",
        "--border": "#828783",
        "--border-control": "#828783",
        "--border-subtle": "#dadfdb",
        "--focus-ring": "#00791e",
        "--focus-ring-surface": "#00791e",
        "--focus-ring-control": "#00791e",
        "--focus-ring-offset": "#f4f9f5",
        "--button-primary-background": "#008622",
        "--button-secondary-background": "#864300",
        "--button-accent-background": "#7c48d7",
        "--success": "#006946",
        "--warning": "#725200",
        "--danger": "#a80018",
        "--info": "#005d91",
        "--link-foreground": "#006b19",
        "--badge-primary-background": "#beffbf",
        "--badge-primary-foreground": "#005e15",
        "--badge-success-background": "#b3ffd9",
        "--badge-success-foreground": "#005c3d",
        "--badge-warning-background": "#ffe8bf",
        "--badge-warning-foreground": "#644800",
        "--badge-danger-background": "#ffe4e1",
        "--badge-danger-foreground": "#940014",
        "--badge-info-background": "#daeeff",
        "--badge-info-foreground": "#005280",
    },
    dark: {
        "--background": "#171b17",
        "--surface": "#1f2320",
        "--elevation-0": "#171b17",
        "--elevation-1": "#1f2320",
        "--elevation-2": "#272b28",
        "--elevation-3": "#303431",
        "--elevation-4": "#393d3a",
        "--foreground": "#edf1ee",
        "--surface-foreground": "#edf1ee",
        "--muted-foreground": "#bbbfbc",
        "--subtle-foreground": "#9c9f9c",
        "--border": "#747975",
        "--border-control": "#747975",
        "--border-subtle": "#3d413d",
        "--focus-ring": "#56e665",
        "--focus-ring-surface": "#56e665",
        "--focus-ring-control": "#56e665",
        // Two dark-mode departures from the source palette, forced by the sandwich
        // `--focus-ring-offset` sits in: `focus-offset` grades the offset ring
        // against the *tightest* of the three action fills at 3:1, while
        // `focus-control` grades the outer ring against that same offset. The source
        // pinned the fills to `secondary-700` and `accent-600`, which no offset can
        // satisfy from both sides at once. Their own `500` stops can: 3.60:1 and
        // 3.42:1 from the solved offset, 5.28:1 and 5.58:1 under the white label.
        // Nothing lighter survives the label, nothing darker survives the ring — the
        // window is one stop wide.
        "--button-primary-background": "#00791e",
        "--button-secondary-background": "#a75600",
        "--button-accent-background": "#7c48d7",
        "--success": "#00bb80",
        "--warning": "#ca9400",
        "--danger": "#ff635e",
        "--info": "#47a7eb",
        "--link-foreground": "#56e665",
        "--badge-primary-background": "#193d1b",
        "--badge-primary-foreground": "#56e665",
        "--badge-success-background": "#003f29",
        "--badge-success-foreground": "#3de4a3",
        "--badge-warning-background": "#463000",
        "--badge-warning-foreground": "#f8b815",
        "--badge-danger-background": "#532321",
        "--badge-danger-foreground": "#ffaba3",
        "--badge-info-background": "#083756",
        "--badge-info-foreground": "#8eccfc",
    },
};
/**
 * Turf's five re-hued families are ramp stops, so they are mode-independent for
 * the same reason every generated ramp is: a tonal scale has no mode, only the
 * semantic roles that select from it do.
 */
const TURF_TOKEN_OVERRIDES = {
    light: Object.assign(Object.assign({}, TURF_RAMP_OVERRIDES), TURF_SEMANTIC_OVERRIDES.light),
    dark: Object.assign(Object.assign({}, TURF_RAMP_OVERRIDES), TURF_SEMANTIC_OVERRIDES.dark),
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
/**
 * `500` is the action fill: `Button` variant `primary` paints white text on it,
 * so a lightness alias alone is not enough — the step has to clear WCAG 2.1 AA
 * *and* the APCA body target against white. The action stop is therefore solved
 * rather than looked up, and 600-950 are pushed down the ramp behind it so hover
 * and pressed states stay darker than rest.
 */
const ACTION_STEP = 500;
const ACTION_LABEL = "#ffffff";
const ACTION_USE = "body";
/** The solver never darkens the action fill past what Tailwind would call 800. */
const ACTION_FLOOR_STEP = 800;
export const STATUS_PALETTES = ["success", "warning", "danger", "info"];
function rampIndexOf(step) {
    return RAMP_STEPS.indexOf(step);
}
function nominalIndex(stop) {
    return rampIndexOf(TAILWIND_ALIASES[stop]);
}
function solveActionIndex(ramp) {
    const start = nominalIndex(ACTION_STEP);
    const floor = nominalIndex(ACTION_FLOOR_STEP);
    for (let index = start; index <= floor; index += 1) {
        const step = RAMP_STEPS[index];
        if (evaluatePair(ACTION_LABEL, oklchToHex(ramp[step]), ACTION_USE).passes)
            return index;
    }
    return start;
}
/**
 * One alias table serves every palette so that `primary-100` and `accent-100`
 * stay siblings; it is solved on the brand ramp, the only one used as an action
 * fill.
 */
function resolveAliases(brand) {
    const action = solveActionIndex(brand);
    const table = {};
    let rank = 0;
    for (const stop of TAILWIND_STEPS) {
        const nominal = nominalIndex(stop);
        const index = stop < ACTION_STEP
            ? nominal
            : Math.min(RAMP_STEPS.length - 1, Math.max(nominal, action + rank));
        table[stop] = RAMP_STEPS[index];
        if (stop >= ACTION_STEP)
            rank += 1;
    }
    return table;
}
function shadeScale(ramp, aliases) {
    const scale = {};
    for (const stop of TAILWIND_STEPS) {
        scale[stop] = oklchToHex(ramp[aliases[stop]]);
    }
    return scale;
}
/**
 * Reads the graph's primitive ramps back out of the flattened document rather
 * than rebuilding them, so the JS values and the exported CSS can never drift.
 */
function primitiveScales(doc) {
    var _a;
    const scales = {};
    for (const token of flattenDocument(doc).primitive) {
        const palette = token.path[2];
        const step = token.path[3];
        if (palette === undefined || step === undefined)
            continue;
        const scale = (_a = scales[palette]) !== null && _a !== void 0 ? _a : {};
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
    var _a;
    const partners = harmonize(seed, harmony).slice(1);
    if (partners.length > 1)
        return partners[partners.length - 1];
    return ((_a = harmonize(seed, "analogous")[2]) !== null && _a !== void 0 ? _a : seed);
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
/**
 * The flat properties every component styles against. Elevation follows the
 * engine's ladder: in light mode the canvas is the *darkest* surface and layers
 * rise toward white, which is what makes a raised hover state visible without a
 * shadow.
 */
const SEMANTIC_VARIABLES = [
    { name: "--background", group: "background", role: "canvas" },
    { name: "--surface", group: "background", role: "surface" },
    { name: "--foreground", group: "foreground", role: "primary" },
    { name: "--muted-foreground", group: "foreground", role: "secondary" },
    { name: "--border", group: "border", role: "default" },
    { name: "--focus-ring", group: "border", role: "focus" },
    { name: "--success", group: "status", role: "success" },
    { name: "--warning", group: "status", role: "warning" },
    { name: "--danger", group: "status", role: "danger" },
    { name: "--info", group: "status", role: "info" },
    { name: "--elevation-0", group: "background", role: "canvas" },
    { name: "--elevation-1", group: "background", role: "surface" },
    { name: "--elevation-2", group: "background", role: "raised" },
    { name: "--elevation-3", group: "background", role: "overlay" },
    { name: "--elevation-4", group: "background", role: "dialog" },
];
function roleOf(roles, spec) {
    switch (spec.group) {
        case "background":
            return roles.background[spec.role];
        case "foreground":
            return roles.foreground[spec.role];
        case "border":
            return roles.border[spec.role];
        case "status":
            return roles.status[spec.role];
    }
}
/** The tinted label surfaces: a fill step plus a label step, one per status hue. */
export const BADGE_PALETTES = ["primary", "success", "warning", "danger", "info"];
/** The three fills `Button` paints a white label on. */
const ACTION_PALETTES = ["primary", "secondary", "accent"];
const BADGE_LABEL_STEP = { light: 800, dark: 300 };
const BADGE_FILL_STEP = { light: 100, dark: 950 };
const LINK_STEP = BADGE_LABEL_STEP;
function stopColor(palette, name, stop) {
    return palette.ramps[name][palette.aliases[stop]];
}
/**
 * The two candidates an on-colour is solved from. White is preferred whenever
 * it clears WCAG 2.2 AA SC 1.4.3 (4.5:1) against the fill; otherwise the fill
 * is light and black is the colour that clears it. The choice is a function of
 * the fill, measured per mode — never an assumed white.
 */
const ON_COLOUR_LIGHT = "#ffffff";
const ON_COLOUR_DARK = "#000000";
function solveOnColour(fill) {
    return hexToOklch(contrastRatio(ON_COLOUR_LIGHT, fill) >= 4.5 ? ON_COLOUR_LIGHT : ON_COLOUR_DARK);
}
function onActionFill(name) {
    return (palette) => solveOnColour(oklchToHex(stopColor(palette, name, ACTION_STEP)));
}
function onStatusFill(name) {
    return (palette, mode) => solveOnColour(oklchToHex(palette.roles[mode].status[name].color));
}
/**
 * One dedicated property per role the contrast solver is allowed to move.
 *
 * Before this table each solved role wrote whichever property happened to carry
 * its default — body-on-canvas and body-on-card both wrote `--foreground`, link
 * and badge label both wrote the `--color-primary-800` primitive step — so
 * solving one pair silently undid another's fix (audit Fix 4). Each of these is
 * seeded from the same primitive or semantic role it used to read, so an
 * un-overridden theme renders byte-identically; the difference is that an
 * override now lands on a property nothing else owns, and never on a
 * `--color-<palette>-<stop>` scale step.
 *
 * The seeding rule only applies to a property that had a predecessor.
 * `--border-subtle` had none: it is the decorative hairline and reads
 * `border.subtle`, the ungated L 0.92 / 0.24 separator — not `border.default`,
 * whose 3:1 control boundary would paint every card and table edge as a heavy
 * line. Its pair is graded `exempt` under SC 1.4.11, so darkening it toward a
 * gating ratio is a regression, not a fix.
 *
 * `--subtle-foreground` had none either. It is the third text tier —
 * `foreground.muted`, L 0.50 / 0.64 — which until now no property emitted at
 * all, while `--muted-foreground` carried `foreground.secondary` one step
 * above it. Components that wanted the lighter tier reached for
 * `text-muted-foreground/80` and composited their way to 4.28:1 on the light
 * canvas; the role itself is gated at 4.5:1 against canvas and surface, so the
 * token clears what the alpha could not. Its name is offset from its role by
 * exactly the offset `--muted-foreground` already carries — closing that is a
 * rename of a shipped property, not this variable's job.
 *
 * The gate is canvas and surface only (`buildSemanticRoles`), so
 * `foreground.muted` is not guaranteed on `--elevation-2..4`: in dark mode it
 * measures 4.52:1 on the overlay and 3.99:1 on the dialog. Third-tier text
 * inside a Drawer or Modal belongs on `--muted-foreground`.
 */
const DERIVED_VARIABLES = [
    { name: "--surface-foreground", pick: (p, m) => p.roles[m].foreground.primary.color },
    { name: "--subtle-foreground", pick: (p, m) => p.roles[m].foreground.muted.color },
    { name: "--link-foreground", pick: (p, m) => stopColor(p, "primary", LINK_STEP[m]) },
    { name: "--brand-foreground", pick: (p, m) => p.roles[m].accent.brand.color },
    { name: "--border-subtle", pick: (p, m) => p.roles[m].border.subtle.color },
    { name: "--border-control", pick: (p, m) => p.roles[m].border.default.color },
    { name: "--focus-ring-surface", pick: (p, m) => p.roles[m].border.focus.color },
    { name: "--focus-ring-control", pick: (p, m) => p.roles[m].border.focus.color },
    { name: "--focus-ring-offset", pick: (p, m) => p.roles[m].border.focusOffset.color },
    ...ACTION_PALETTES.map((name) => ({
        name: `--button-${name}-background`,
        pick: (p) => stopColor(p, name, ACTION_STEP),
    })),
    // On-colour foregrounds, one per semantic fill. Each is solved from the fill
    // it sits on (white when white clears 4.5:1, black when the fill is light),
    // so a light dark-mode status fill gets a dark label instead of an assumed
    // white one.
    ...ACTION_PALETTES.map((name) => ({
        name: `--button-${name}-foreground`,
        pick: onActionFill(name),
    })),
    ...STATUS_PALETTES.map((name) => ({
        name: `--${name}-foreground`,
        pick: onStatusFill(name),
    })),
    {
        name: "--neutral-foreground",
        pick: (p) => solveOnColour(oklchToHex(stopColor(p, "neutral", 900))),
    },
    ...BADGE_PALETTES.flatMap((name) => [
        {
            name: `--badge-${name}-foreground`,
            pick: (p, m) => stopColor(p, name, BADGE_LABEL_STEP[m]),
        },
        {
            name: `--badge-${name}-background`,
            pick: (p, m) => stopColor(p, name, BADGE_FILL_STEP[m]),
        },
    ]),
];
function variable(name, color) {
    return { name, hex: oklchToHex(color), literal: formatOklch(color) };
}
/** `--color-<palette>-<stop>`, identical in both modes: a ramp has no mode. */
export function paletteVariables(palette) {
    const variables = [];
    const paletteNames = [
        ...APP_PALETTES,
        ...STATUS_PALETTES,
    ];
    for (const name of paletteNames) {
        for (const stop of TAILWIND_STEPS) {
            variables.push(variable(`--color-${name}-${stop}`, palette.ramps[name][palette.aliases[stop]]));
        }
    }
    return variables;
}
export function semanticVariables(palette, mode) {
    const roles = palette.roles[mode];
    return [
        ...SEMANTIC_VARIABLES.map((spec) => variable(spec.name, roleOf(roles, spec).color)),
        ...DERIVED_VARIABLES.map((spec) => variable(spec.name, spec.pick(palette, mode))),
    ];
}
/**
 * The roles the contrast solver may move, one per graded pair. Every entry owns
 * exactly one property in {@link ROLE_VARIABLES}.
 */
export const SOLVABLE_ROLES = [
    "body",
    "body-surface",
    "muted",
    "subtle",
    "action",
    "action-secondary",
    "action-accent",
    "link",
    "brand",
    "badge",
    "focus",
    "focus-surface",
    "focus-offset",
    "focus-control",
    "border-subtle",
    "border-control",
    "success",
    "badge-success",
    "warning",
    "badge-warning",
    "danger",
    "badge-danger",
    "info",
    "badge-info",
];
/**
 * Role to custom property. Injective by construction: no two roles share a
 * property, and no role writes a `--color-<palette>-<stop>` primitive step.
 */
export const ROLE_VARIABLES = {
    body: "--foreground",
    "body-surface": "--surface-foreground",
    muted: "--muted-foreground",
    subtle: "--subtle-foreground",
    action: "--button-primary-background",
    "action-secondary": "--button-secondary-background",
    "action-accent": "--button-accent-background",
    link: "--link-foreground",
    brand: "--brand-foreground",
    badge: "--badge-primary-foreground",
    focus: "--focus-ring",
    "focus-surface": "--focus-ring-surface",
    "focus-offset": "--focus-ring-offset",
    "focus-control": "--focus-ring-control",
    "border-subtle": "--border-subtle",
    "border-control": "--border-control",
    success: "--success",
    "badge-success": "--badge-success-foreground",
    warning: "--warning",
    "badge-warning": "--badge-warning-foreground",
    danger: "--danger",
    "badge-danger": "--badge-danger-foreground",
    info: "--info",
    "badge-info": "--badge-info-foreground",
};
function badgeBackgroundVariable(name) {
    return `--badge-${name}-background`;
}
function roleColorsFrom(read) {
    const colors = {};
    for (const role of SOLVABLE_ROLES)
        colors[role] = read(ROLE_VARIABLES[role]);
    return colors;
}
function badgeBackgroundsFrom(read) {
    const fills = {};
    for (const name of BADGE_PALETTES)
        fills[name] = read(badgeBackgroundVariable(name));
    return fills;
}
/** The cheap half: picks one mode's roles out of an already-built palette. */
export function resolveAppTheme(palette, mode) {
    const semantic = semanticVariables(palette, mode);
    const byName = new Map(semantic.map((entry) => [entry.name, entry.hex]));
    const read = (name) => { var _a; return (_a = byName.get(name)) !== null && _a !== void 0 ? _a : "#000000"; };
    return Object.assign(Object.assign({}, palette), { mode, primary: read(ROLE_VARIABLES.action), secondary: read(ROLE_VARIABLES["action-secondary"]), accent: read(ROLE_VARIABLES["action-accent"]), background: read("--background"), surface: read("--surface"), foreground: read("--foreground"), mutedForeground: read("--muted-foreground"), border: read("--border"), focusRing: read("--focus-ring"), success: read("--success"), warning: read("--warning"), danger: read("--danger"), info: read("--info"), elevation: [
            read("--elevation-0"),
            read("--elevation-1"),
            read("--elevation-2"),
            read("--elevation-3"),
            read("--elevation-4"),
        ], roleColors: roleColorsFrom(read), badgeBackgrounds: badgeBackgroundsFrom(read), variables: [...paletteVariables(palette), ...semantic] });
}
/**
 * Applies CSS variable overrides to an AppTheme, updating its variables,
 * primitive shade scales (e.g. `--color-primary-800`), and semantic role fields.
 */
export function applyThemeOverrides(baseTokens, overrides) {
    const overrideEntries = Object.entries(overrides);
    if (overrideEntries.length === 0)
        return baseTokens;
    const overridesMap = new Map(overrideEntries);
    const variables = baseTokens.variables.map((entry) => {
        const overrideVal = overridesMap.get(entry.name);
        if (overrideVal !== undefined) {
            return {
                name: entry.name,
                hex: overrideVal.startsWith("#") ? overrideVal : entry.hex,
                literal: overrideVal,
            };
        }
        return entry;
    });
    const existingVarNames = new Set(baseTokens.variables.map((v) => v.name));
    for (const [key, val] of overrideEntries) {
        if (!existingVarNames.has(key)) {
            variables.push({
                name: key,
                hex: val.startsWith("#") ? val : val,
                literal: val,
            });
        }
    }
    const scales = {};
    for (const [paletteName, paletteScale] of Object.entries(baseTokens.scales)) {
        scales[paletteName] = Object.assign({}, paletteScale);
    }
    for (const [key, val] of overrideEntries) {
        const match = /^--color-([a-z]+)-(\d+)$/.exec(key);
        if (match) {
            const [, paletteName, stepStr] = match;
            const step = Number(stepStr);
            if (paletteName in scales && step in scales[paletteName]) {
                scales[paletteName][step] = val.startsWith("#") ? val : val;
            }
        }
    }
    const read = (name, fallback) => {
        const val = overrides[name];
        return val && val.startsWith("#") ? val : fallback;
    };
    // The dedicated button property wins; the primitive step stays honoured so a
    // hand-authored `--color-primary-500` override still moves the action fill.
    const primary = read(ROLE_VARIABLES.action, read("--color-primary-500", baseTokens.primary));
    const secondary = read(ROLE_VARIABLES["action-secondary"], read("--color-secondary-500", baseTokens.secondary));
    const accent = read(ROLE_VARIABLES["action-accent"], read("--color-accent-500", baseTokens.accent));
    const roleColors = {};
    for (const role of SOLVABLE_ROLES) {
        roleColors[role] = read(ROLE_VARIABLES[role], baseTokens.roleColors[role]);
    }
    roleColors.action = primary;
    roleColors["action-secondary"] = secondary;
    roleColors["action-accent"] = accent;
    const badgeBackgrounds = {};
    for (const name of BADGE_PALETTES) {
        badgeBackgrounds[name] = read(badgeBackgroundVariable(name), baseTokens.badgeBackgrounds[name]);
    }
    return Object.assign(Object.assign({}, baseTokens), { scales: scales, primary,
        secondary,
        accent, background: read("--background", baseTokens.background), surface: read("--surface", baseTokens.surface), foreground: read("--foreground", baseTokens.foreground), mutedForeground: read("--muted-foreground", baseTokens.mutedForeground), border: read("--border", baseTokens.border), focusRing: read("--focus-ring", baseTokens.focusRing), success: read("--success", baseTokens.success), warning: read("--warning", baseTokens.warning), danger: read("--danger", baseTokens.danger), info: read("--info", baseTokens.info), elevation: [
            read("--elevation-0", baseTokens.elevation[0]),
            read("--elevation-1", baseTokens.elevation[1]),
            read("--elevation-2", baseTokens.elevation[2]),
            read("--elevation-3", baseTokens.elevation[3]),
            read("--elevation-4", baseTokens.elevation[4]),
        ], roleColors,
        badgeBackgrounds,
        variables });
}
export function buildAppTheme(seed, mode, harmony = DEFAULT_HARMONY) {
    return resolveAppTheme(buildAppPalette(seed, harmony), mode);
}
/**
 * A preset's theme for one mode. A preset carrying no overrides resolves to
 * exactly `buildAppTheme(seed, mode, harmony)`, so this is the single entry
 * point whether or not a preset needed to pin any family.
 */
export function buildPresetTheme(preset, mode) {
    var _a, _b;
    return applyThemeOverrides(buildAppTheme(preset.seed, mode, preset.harmony), (_b = (_a = preset.tokenOverrides) === null || _a === void 0 ? void 0 : _a[mode]) !== null && _b !== void 0 ? _b : {});
}
/**
 * What each role is actually held to, at the ratio its criterion actually
 * names.
 *
 * `border-subtle` is the purely decorative separator — a hairline between two
 * rows that carries no state and identifies no control. SC 1.4.11 exempts it,
 * so it is graded `exempt`, which is not the same claim as a pass. Every border
 * that bounds a control, marks a field, or carries meaning is `border-control`
 * and owes the real 3.0:1. The 1.8:1 this table used to call AA was neither.
 */
export const ROLE_THRESHOLDS = {
    "border-subtle": {
        criterion: null,
        aa: { ratio: 0, lc: 0 },
        aaa: { ratio: 0, lc: 0 },
    },
    "border-control": {
        criterion: "1.4.11",
        aa: { ratio: 3.0, lc: 45 },
        aaa: { ratio: 4.5, lc: 60 },
    },
    focus: {
        criterion: "2.4.13",
        aa: { ratio: 3.0, lc: 60 },
        aaa: { ratio: 4.5, lc: 60 },
    },
    text: {
        criterion: "1.4.3",
        aa: { ratio: 4.5, lc: 75 },
        aaa: { ratio: 7.0, lc: 90 },
    },
    "action-fill": {
        criterion: "1.4.3",
        aa: { ratio: 4.5, lc: 75 },
        aaa: { ratio: 7.0, lc: 90 },
    },
    "badge-text": {
        criterion: "1.4.3",
        aa: { ratio: 4.5, lc: 75 },
        aaa: { ratio: 7.0, lc: 90 },
    },
};
/**
 * The offset ring is one colour but sits against three different button fills,
 * and a pair carries one background. Grading it against whichever fill it
 * currently separates worst keeps the single pair honest: the binding adjacency
 * is the one reported, so no fill can hide behind an easier sibling, and a
 * solve that clears this one clears the rest by construction.
 */
function tightestActionFill(theme) {
    const ring = theme.roleColors["focus-offset"];
    let tightest = theme.roleColors.action;
    let lowest = contrastRatio(ring, tightest);
    for (const role of ["action-secondary", "action-accent"]) {
        const fill = theme.roleColors[role];
        const ratio = contrastRatio(ring, fill);
        if (ratio < lowest) {
            lowest = ratio;
            tightest = fill;
        }
    }
    return tightest;
}
/**
 * Which of the two backgrounds `foreground.muted` is gated against reads it
 * worse. The two swap by mode — the light canvas is darker than the card it
 * carries, the dark canvas lighter — so naming one of them in the pair would
 * over-report in whichever mode the other is binding.
 */
function tighterTextGround(theme, foreground) {
    return contrastRatio(foreground, theme.background) <= contrastRatio(foreground, theme.surface)
        ? theme.background
        : theme.surface;
}
/**
 * Every pair reads its foreground (or, for an action fill, its background) out
 * of `roleColors`, so the colour graded here is the colour the role's own
 * property carries — a solved override shows up in the next grade instead of
 * being masked by the primitive step it was derived from.
 *
 * Order matters for `solveAllContrastPairs`, which folds each fix in before
 * reading the next pair: the action fills come before the offset ring that is
 * measured against them, and the offset ring before the outer focus ring that
 * is measured against it.
 */
const PAIR_SPECS = [
    { id: "body", label: "Body text on canvas", use: "body", category: "text", adjustableTarget: "foreground", pick: (t) => [t.roleColors.body, t.background] },
    { id: "body-surface", label: "Body text on card surface", use: "body", category: "text", adjustableTarget: "foreground", pick: (t) => [t.roleColors["body-surface"], t.surface] },
    { id: "muted", label: "Muted text on canvas", use: "body", category: "text", adjustableTarget: "foreground", pick: (t) => [t.roleColors.muted, t.background] },
    {
        id: "subtle",
        label: "Subtle text on whichever of canvas and card surface reads it worse",
        use: "body",
        category: "text",
        adjustableTarget: "foreground",
        pick: (t) => [t.roleColors.subtle, tighterTextGround(t, t.roleColors.subtle)],
    },
    { id: "action", label: "Action label on primary fill", use: "body", category: "action-fill", adjustableTarget: "background", pick: (t) => [ACTION_LABEL, t.roleColors.action] },
    { id: "action-secondary", label: "Action label on secondary fill", use: "body", category: "action-fill", adjustableTarget: "background", pick: (t) => [ACTION_LABEL, t.roleColors["action-secondary"]] },
    { id: "action-accent", label: "Action label on accent fill", use: "body", category: "action-fill", adjustableTarget: "background", pick: (t) => [ACTION_LABEL, t.roleColors["action-accent"]] },
    { id: "link", label: "Link on canvas", use: "body", category: "text", adjustableTarget: "foreground", pick: (t) => [t.roleColors.link, t.background] },
    {
        id: "brand",
        label: "Brand foreground on whichever of canvas and card surface reads it worse",
        use: "body",
        category: "text",
        adjustableTarget: "foreground",
        pick: (t) => [t.roleColors.brand, tighterTextGround(t, t.roleColors.brand)],
    },
    { id: "badge", label: "Badge label on tinted badge", use: "body", category: "badge-text", adjustableTarget: "foreground", pick: (t) => [t.roleColors.badge, t.badgeBackgrounds.primary] },
    { id: "focus", label: "Focus ring against canvas", use: "ui", category: "focus", adjustableTarget: "foreground", pick: (t) => [t.roleColors.focus, t.background] },
    { id: "focus-surface", label: "Focus ring against card surface", use: "ui", category: "focus", adjustableTarget: "foreground", pick: (t) => [t.roleColors["focus-surface"], t.surface] },
    {
        // SC 2.4.13: the indicator has to be visible against the control it
        // surrounds, not only against the page behind it — a ring that inherits the
        // accent it outlines indicates nothing. What touches the fill, though, is
        // the offset ring, not the outer ring: the theme paints
        // `fill | offset | outer | surface`, so this is the adjacency a keyboard
        // user actually sees, and the one the offset ring is solved for.
        id: "focus-offset",
        label: "Focus offset ring against the control fill it outlines",
        use: "ui",
        category: "focus",
        adjustableTarget: "foreground",
        pick: (t) => [t.roleColors["focus-offset"], tightestActionFill(t)],
    },
    {
        // The other half of that chain. Grading the outer ring straight against the
        // fill measured an inset ring the theme never paints, and in dark mode no
        // colour could satisfy it; the offset ring between them is what the outer
        // ring is read against.
        id: "focus-control",
        label: "Focus ring against the offset ring inside it",
        use: "ui",
        category: "focus",
        adjustableTarget: "foreground",
        pick: (t) => [t.roleColors["focus-control"], t.roleColors["focus-offset"]],
    },
    { id: "border-subtle", label: "Decorative separator on card surface", use: "decorative", category: "border-subtle", adjustableTarget: "foreground", pick: (t) => [t.roleColors["border-subtle"], t.surface] },
    { id: "border-control", label: "Control border against surface", use: "ui", category: "border-control", adjustableTarget: "foreground", pick: (t) => [t.roleColors["border-control"], t.surface] },
    { id: "success", label: "Success text on canvas", use: "body", category: "text", adjustableTarget: "foreground", pick: (t) => [t.roleColors.success, t.background] },
    { id: "badge-success", label: "Success badge label on tinted fill", use: "body", category: "badge-text", adjustableTarget: "foreground", pick: (t) => [t.roleColors["badge-success"], t.badgeBackgrounds.success] },
    { id: "warning", label: "Warning text on canvas", use: "body", category: "text", adjustableTarget: "foreground", pick: (t) => [t.roleColors.warning, t.background] },
    { id: "badge-warning", label: "Warning badge label on tinted fill", use: "body", category: "badge-text", adjustableTarget: "foreground", pick: (t) => [t.roleColors["badge-warning"], t.badgeBackgrounds.warning] },
    { id: "danger", label: "Danger text on canvas", use: "body", category: "text", adjustableTarget: "foreground", pick: (t) => [t.roleColors.danger, t.background] },
    { id: "badge-danger", label: "Danger badge label on tinted fill", use: "body", category: "badge-text", adjustableTarget: "foreground", pick: (t) => [t.roleColors["badge-danger"], t.badgeBackgrounds.danger] },
    { id: "info", label: "Info text on canvas", use: "body", category: "text", adjustableTarget: "foreground", pick: (t) => [t.roleColors.info, t.background] },
    { id: "badge-info", label: "Info badge label on tinted fill", use: "body", category: "badge-text", adjustableTarget: "foreground", pick: (t) => [t.roleColors["badge-info"], t.badgeBackgrounds.info] },
];
function pairFromSpec(spec, theme) {
    const [foreground, background] = spec.pick(theme);
    const thresholds = ROLE_THRESHOLDS[spec.category];
    const baseReport = evaluatePair(foreground, background, spec.use);
    const ratio = baseReport.wcag.ratio;
    const lc = baseReport.apca.lc;
    // The ratio is the gate. APCA is carried alongside it as a quality signal and
    // is deliberately absent from `passes`: it may not rescue a short ratio, and
    // no category may waive the ratio to reach a pass.
    const wcagPasses = ratio >= thresholds.aa.ratio;
    const apcaPasses = Math.abs(lc) >= thresholds.aa.lc;
    const report = Object.assign(Object.assign({}, baseReport), { wcag: Object.assign(Object.assign({}, baseReport.wcag), { required: thresholds.aa.ratio, passes: wcagPasses }), apca: Object.assign(Object.assign({}, baseReport.apca), { required: thresholds.aa.lc, passes: apcaPasses }), passes: wcagPasses });
    return {
        id: spec.id,
        label: spec.label,
        mode: theme.mode,
        use: spec.use,
        category: spec.category,
        adjustableTarget: spec.adjustableTarget,
        thresholds,
        cssVariable: ROLE_VARIABLES[spec.id],
        verdict: thresholds.criterion === null ? "exempt" : wcagPasses ? "pass" : "fail",
        foreground,
        background,
        report,
    };
}
export function themeContrastPairs(theme) {
    return PAIR_SPECS.map((spec) => pairFromSpec(spec, theme));
}
const PARTIAL_SCORE = 50;
/**
 * Grades a palette by what its *generated* theme achieves in both modes, not by
 * the seed colour in isolation: the engine solves the action stop and the
 * on-colours, so a raw hex says very little about the palette it produces.
 */
export function gradePalette(palette, tokenOverrides) {
    var _a, _b;
    const lightTheme = applyThemeOverrides(resolveAppTheme(palette, "light"), (_a = tokenOverrides === null || tokenOverrides === void 0 ? void 0 : tokenOverrides.light) !== null && _a !== void 0 ? _a : {});
    const darkTheme = applyThemeOverrides(resolveAppTheme(palette, "dark"), (_b = tokenOverrides === null || tokenOverrides === void 0 ? void 0 : tokenOverrides.dark) !== null && _b !== void 0 ? _b : {});
    const pairs = [
        ...themeContrastPairs(lightTheme),
        ...themeContrastPairs(darkTheme),
    ];
    // An exempt role has no criterion to score against, so counting it would only
    // pad the average with a free 100%. The grade is what the gated pairs earned.
    const gated = pairs.filter((pair) => pair.verdict !== "exempt");
    const achieved = gated.map((pair) => {
        const { wcag, apca } = pair.report;
        const ratioShare = wcag.required <= 0 ? 1 : wcag.ratio / wcag.required;
        const lcShare = apca.required <= 0 ? 1 : Math.abs(apca.lc) / apca.required;
        return Math.min(1, ratioShare, lcShare);
    });
    const score = achieved.length === 0
        ? 100
        : Math.round((achieved.reduce((sum, value) => sum + value, 0) / achieved.length) * 100);
    const failing = gated.filter((pair) => pair.verdict === "fail");
    const level = failing.length > 0
        ? score >= PARTIAL_SCORE
            ? "Partial"
            : "Fail"
        : gated.every((pair) => pair.report.wcag.level === "AAA")
            ? "AAA"
            : "AA";
    return { seed: palette.seed, score, level, pairs, failing };
}
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
/**
 * The nearest seed on the same hue and chroma line that can serve as the action
 * fill at its own lightness, so the alias solver never has to darken `500` away
 * from the colour the user picked. Only lightness moves, for the same reason
 * the engine's own solver only moves lightness: hue and chroma are the brand.
 */
export function suggestSeed(seed) {
    const fix = autoFixSeedForContrast(seed, "AA");
    if (!fix.adjusted)
        return null;
    const origin = hexToOklch(seed);
    return {
        seed: fix.seed,
        deltaE: fix.deltaE,
        description: `Holds hue ${Math.round(origin.h)}° and chroma ${origin.c.toFixed(3)} and moves only OKLCH lightness, so the seed itself carries white body text at WCAG 2.1 AA and APCA Lc 75.`,
    };
}
/**
 * The one property a solved role writes.
 *
 * It no longer depends on the mode: the mapping used to hand `link` and `badge`
 * the same primitive step, and both `body` variants the same `--foreground`, so
 * whichever pair was solved second silently overwrote the first one's fix. Each
 * role now owns a property nothing else writes, seeded from the value it used to
 * read. The second argument is kept so existing call sites keep compiling.
 */
export function getCssVariableForPair(pairId, _mode) {
    var _a;
    const known = ROLE_VARIABLES;
    return (_a = known[pairId]) !== null && _a !== void 0 ? _a : ROLE_VARIABLES.body;
}
/**
 * Role-specific contrast solver. Adjusts the token (foreground text/border/focus
 * or background fill) by minimal OKLCH lightness shift, preserving hue and
 * chroma, until it clears the role's real threshold.
 *
 * The whole lightness axis is searched, both lighter and darker than where the
 * role starts, and the nearest passing lightness wins — the auto-constrain
 * guarantee is that a reachable pass is found, so a one-sided search that can
 * miss it is a bug, not a preference.
 *
 * The gate is the WCAG 2.2 ratio. Among the lightnesses that clear it the solver
 * prefers one that also meets the advisory APCA target, but when no such
 * lightness exists in gamut it returns the nearest ratio-clearing colour and
 * reports `apca.passes: false` — the ratio decides, and the report says so.
 * There is no lightness window that reports a pass a colour did not earn.
 */
export function solvePairForRole(pair, targetLevel = "AA", mode = pair.mode) {
    const cssVariable = ROLE_VARIABLES[pair.id];
    const targetConfig = targetLevel === "AAA" ? pair.thresholds.aaa : pair.thresholds.aa;
    const isAdjustingForeground = pair.adjustableTarget === "foreground";
    const originColor = hexToOklch(isAdjustingForeground ? pair.foreground : pair.background);
    const fixedHex = isAdjustingForeground ? pair.background : pair.foreground;
    const initialFg = isAdjustingForeground ? pair.foreground : fixedHex;
    const initialBg = isAdjustingForeground ? fixedHex : pair.background;
    const initialRatio = contrastRatio(initialFg, initialBg);
    const initialLc = apcaLc(initialFg, initialBg);
    const createReport = (fg, bg) => {
        const base = evaluatePair(fg, bg, pair.use);
        const wcagPasses = base.wcag.ratio >= targetConfig.ratio;
        const apcaPasses = Math.abs(base.apca.lc) >= targetConfig.lc;
        return Object.assign(Object.assign({}, base), { wcag: Object.assign(Object.assign({}, base.wcag), { required: targetConfig.ratio, passes: wcagPasses }), apca: Object.assign(Object.assign({}, base.apca), { required: targetConfig.lc, passes: apcaPasses }), passes: wcagPasses });
    };
    const unchanged = () => ({
        solvedHex: isAdjustingForeground ? pair.foreground : pair.background,
        cssVariable,
        report: createReport(initialFg, initialBg),
        roleType: pair.category,
    });
    // An exempt role has no ratio to earn, so there is nothing to move it toward.
    if (pair.thresholds.criterion === null)
        return unchanged();
    // Already clears the gate with the advisory target to spare: leave it alone.
    if (initialRatio >= targetConfig.ratio && Math.abs(initialLc) >= targetConfig.lc) {
        return unchanged();
    }
    // Both halves of the lightness axis are searched, and the nearest passing
    // lightness wins. The colour still normally keeps the side of its counterpart
    // it already sits on — dark text stays dark, a light ring stays light —
    // because that side is where the nearest pass almost always lies. But it is
    // only *almost* always: once the engine has darkened an action fill, the dark
    // half below that fill can top out under the required ratio while the light
    // half clears it comfortably, so a search confined to the near half reported a
    // near-miss for a pass that was reachable. The mode is now only a tie-break
    // between two equally near passes — light mode reaches for the darker one.
    const preferDarkerOnTie = mode === "light";
    const clampL = (l) => Math.min(1, Math.max(0, l));
    const originL = clampL(originColor.l);
    const at = (l) => {
        const hex = oklchToHex({ l: clampL(l), c: originColor.c, h: originColor.h });
        const fg = isAdjustingForeground ? hex : fixedHex;
        const bg = isAdjustingForeground ? fixedHex : hex;
        const ratio = contrastRatio(fg, bg);
        const lc = apcaLc(fg, bg);
        const gated = ratio >= targetConfig.ratio;
        return { gated, preferred: gated && Math.abs(lc) >= targetConfig.lc, ratio, lc };
    };
    const SAMPLES = 101;
    const TIE = 1e-9;
    const consider = (nearest, l, distance) => {
        if (nearest.l === null || distance < nearest.distance - TIE) {
            nearest.l = l;
            nearest.distance = distance;
            return;
        }
        if (distance > nearest.distance + TIE)
            return;
        if (preferDarkerOnTie ? l < nearest.l : l > nearest.l)
            nearest.l = l;
    };
    const nearestPreferred = { l: null, distance: Number.POSITIVE_INFINITY };
    const nearestGated = { l: null, distance: Number.POSITIVE_INFINITY };
    let bestEffortL = originL;
    let bestEffortScore = -1;
    for (let i = 0; i < SAMPLES; i += 1) {
        const l = i / (SAMPLES - 1);
        const res = at(l);
        const distance = Math.abs(l - originL);
        if (res.preferred)
            consider(nearestPreferred, l, distance);
        if (res.gated)
            consider(nearestGated, l, distance);
        if (!res.gated) {
            const score = Math.min(targetConfig.ratio <= 0 ? 1 : res.ratio / targetConfig.ratio, targetConfig.lc <= 0 ? 1 : Math.abs(res.lc) / targetConfig.lc);
            if (score > bestEffortScore) {
                bestEffortScore = score;
                bestEffortL = l;
            }
        }
    }
    const finish = (hex) => ({
        solvedHex: hex,
        cssVariable,
        report: createReport(isAdjustingForeground ? hex : fixedHex, isAdjustingForeground ? fixedHex : hex),
        roleType: pair.category,
    });
    // Nothing in gamut on this hue and chroma line clears the ratio, in either
    // direction. Hand back the closest attempt; its report fails, which is the
    // honest answer.
    const gatedL = nearestGated.l;
    if (gatedL === null) {
        return finish(oklchToHex({ l: clampL(bestEffortL), c: originColor.c, h: originColor.h }));
    }
    const preferredL = nearestPreferred.l;
    const preferAdvisory = preferredL !== null;
    const meetsTarget = (sample) => preferAdvisory ? sample.preferred : sample.gated;
    let passing = preferredL !== null && preferredL !== void 0 ? preferredL : gatedL;
    // Bisect against the coarse sample one step *inside* the winning one, so the
    // bracket never spans the counterpart's own lightness — where contrast turns
    // around and a bisection would have no single crossing to find.
    const coarseStep = 1 / (SAMPLES - 1);
    const towardOrigin = Math.sign(originL - passing);
    let failing = towardOrigin === 0 ? originL : clampL(passing + towardOrigin * coarseStep);
    if (Math.abs(failing - originL) > Math.abs(passing - originL))
        failing = originL;
    if (!meetsTarget(at(failing))) {
        for (let i = 0; i < 24 && Math.abs(passing - failing) > 1e-5; i += 1) {
            const mid = (passing + failing) / 2;
            if (meetsTarget(at(mid))) {
                passing = mid;
            }
            else {
                failing = mid;
            }
        }
    }
    else {
        passing = failing;
    }
    return finish(oklchToHex({ l: clampL(passing), c: originColor.c, h: originColor.h }));
}
/**
 * Solves all semantic contrast pairs in a theme according to their context and
 * role. Every solution names a different `cssVariable`, so the whole set can be
 * committed as one override map without any two entries fighting.
 *
 * Each fix is folded into the theme before the next pair is read, so a pair
 * measured against a role that was just solved — the focus ring against the
 * action fill, say — is graded against the fill it will actually sit on rather
 * than the one it started from.
 */
export function solveAllContrastPairs(theme, target = "AA") {
    let current = theme;
    return PAIR_SPECS.map((spec) => {
        const pair = pairFromSpec(spec, current);
        const solved = solvePairForRole(pair, target, theme.mode);
        current = applyThemeOverrides(current, { [solved.cssVariable]: solved.solvedHex });
        return {
            id: pair.id,
            label: pair.label,
            originalFg: pair.foreground,
            solvedFg: solved.solvedHex,
            report: solved.report,
            category: pair.category,
            cssVariable: solved.cssVariable,
            verdict: pair.thresholds.criterion === null ? "exempt" : solved.report.passes ? "pass" : "fail",
        };
    });
}
/**
 * Derives both the contrast-fixed seed and solutions for all failing pairs in the theme.
 */
export function autoFixTheme(theme, target = "AA") {
    const seedFix = autoFixSeedForContrast(theme.seed, target);
    const pairSolutionsList = solveAllContrastPairs(theme, target);
    const pairSolutions = {};
    for (const sol of pairSolutionsList) {
        pairSolutions[sol.id] = { hex: sol.solvedFg, report: sol.report, cssVariable: sol.cssVariable };
    }
    return {
        fixedSeed: seedFix.seed,
        pairSolutions,
    };
}
const THEME_DARK_SELECTOR = 'html[data-theme="dark"]';
const THEME_SYSTEM_DARK_SELECTOR = 'html:not([data-theme="light"])';
/**
 * One declaration pair per property: the hex fallback first, then the `oklch()`
 * value. Engines without CSS Color 4 keep the hex; engines with it take the
 * wider-gamut declaration that follows.
 */
function themeDeclarations(variables, indent) {
    return variables
        .map((entry) => `${indent}${entry.name}: ${entry.hex};\n${indent}${entry.name}: ${entry.literal};`)
        .join("\n");
}
/** `--background` becomes the `--color-background` Tailwind generates utilities from. */
function themeBridgeAlias(entry) {
    return `  --color${entry.name.slice(1)}: var(${entry.name});`;
}
/**
 * The single app-facing stylesheet emitter: the three colour blocks, the
 * app-facing alias layer and the `@theme inline` bridge, plus the `@import`
 * that pulls in the seed-independent `base.css` layer.
 *
 * This is the only implementation. `generateTheme(seed).css` returns it, and
 * `scripts/generate-tokens.ts` writes it to `src/styles/tokens.css` — there is
 * no second copy of this emission. Only the 11 public ramp stops
 * (50-950) are emitted: components reference exactly those, every value is a
 * literal so no alias can point at a dropped step, and `--format dtcg` already
 * carries the complete 26-step graph.
 *
 * Studio per-mode overrides are deliberately absent here. They are keyed by
 * the DTCG graph's variable names, which this vocabulary does not share, and
 * applying them would move the shipped dark values. The returned string has no
 * trailing newline; writers terminate it.
 */
export function buildThemeStylesheet(palette, meta) {
    const paletteEntries = paletteVariables(palette);
    const light = semanticVariables(palette, "light");
    const dark = semanticVariables(palette, "dark");
    return [
        "/*",
        " * acciva-ui/styles — GENERATED FILE, DO NOT EDIT.",
        " *",
        ` * Source: generateTheme("${meta.seed}", { harmony: "${meta.harmony}" }) — the same`,
        ' * code path as `npx acciva theme "<seed>"`. Regenerate with',
        " * `npm run tokens:generate`, which writes this file to src/styles/tokens.css.",
        " * Every colour is an 11-step public stop (50-950) or a semantic role the",
        " * engine gated on WCAG 2.1 AA and APCA.",
        " * Each property is declared twice: hex fallback, then the oklch() value.",
        " *",
        ` * ${RADIUS_BASE_VARIABLE} is the one length the theme provider writes; the @theme`,
        " * block below re-derives Tailwind's whole --radius-* namespace from it, so every",
        " * rounded-* utility scales with it. Overriding it is the supported way to reshape",
        " * the scale — the individual --radius-* stops are computed, not settings.",
        " *",
        ' * The `@import "./base.css"` below pulls in the seed-independent layer: the',
        " * reset, the focus ring, the fade keyframes, the touch-target helper and the",
        " * safe-area tokens and utilities (see .agents/pwa.md). That layer lives in",
        " * src/styles/base.css, which regeneration never touches.",
        " */",
        "",
        '@import "./base.css";',
        "",
        ":root {",
        themeDeclarations(paletteEntries, "  "),
        "",
        themeDeclarations(light, "  "),
        "",
        `  ${RADIUS_BASE_VARIABLE}: ${RADIUS_MAP[DEFAULT_RADIUS].rem};
  --font-sans: var(--font-geist-sans, system-ui, -apple-system, sans-serif);
  --font-acciva: var(--font-acciva-sans, var(--font-sans));
  --font-display: var(--font-acciva-display, var(--font-sans));
  --font-mono: var(--font-acciva-mono, var(--font-geist-mono, monospace));
  --font-custom: var(--font-acciva-custom, var(--font-sans));`,
        "}",
        "",
        `${THEME_DARK_SELECTOR} {`,
        "  color-scheme: dark;",
        themeDeclarations(dark, "  "),
        "}",
        "",
        "@media (prefers-color-scheme: dark) {",
        `  ${THEME_SYSTEM_DARK_SELECTOR} {`,
        "    color-scheme: dark;",
        themeDeclarations(dark, "    "),
        "  }",
        "}",
        "",
        "@theme inline {",
        "  --color-chart-1: var(--chart-1);",
        "  --color-chart-2: var(--chart-2);",
        "  --color-chart-3: var(--chart-3);",
        "  --color-chart-4: var(--chart-4);",
        "  --color-chart-5: var(--chart-5);",
        "  --color-chart-6: var(--chart-6);",
        "  --color-chart-7: var(--chart-7);",
        "  --color-chart-8: var(--chart-8);",
        paletteEntries.map((entry) => `  ${entry.name}: var(${entry.name});`).join("\n"),
        "",
        light.map(themeBridgeAlias).join("\n"),
        "",
        radiusVariables()
            .map((entry) => `  ${entry.name}: ${entry.value};`)
            .join("\n"),
        "",
        "  --font-sans: var(--font-geist-sans, system-ui, -apple-system, sans-serif);",
        "  --font-acciva: var(--font-acciva-sans, var(--font-sans));",
        "  --font-display: var(--font-acciva-display, var(--font-sans));",
        "  --font-mono: var(--font-acciva-mono, var(--font-geist-mono, monospace));",
        "  --font-custom: var(--font-acciva-custom, var(--font-sans));",
        "",
        "  --animate-fade-in: acciva-fade-in 0.15s ease-out;",
        "}",
    ].join("\n");
}
