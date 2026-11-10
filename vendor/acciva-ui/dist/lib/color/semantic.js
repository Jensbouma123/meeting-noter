import { oklchToHex } from "./space.js";
import { apcaLc, contrastRatio } from "./contrast.js";
import { solveDualMode } from "./constrain.js";
/**
 * Dark-mode elevation ladder (ALGORITHMS.md §7). Depth in dark mode is carried
 * by lightness, never by shadow, and the base canvas is never pure black.
 */
export const ELEVATION_L = [0.14, 0.17, 0.2, 0.24, 0.28];
/**
 * Light-mode elevation ladder. Lightness saturates at the top of the scale, so
 * the layers above 03dp share it and the remaining separation is carried by the
 * border roles rather than by more lightness.
 */
const LIGHT_ELEVATION_L = [0.93, 0.96, 0.98, 0.98, 0.98];
/**
 * The light (980/960/950/930) and dark (280/240/200/170/140) elevation ladders,
 * keyed by lightness x 1000. These are deliberately NOT members of RAMP_STEPS:
 * a tonal ramp only lands near them, and ALGORITHMS.md §7 fixes the dark ladder
 * at exactly 0.14/0.17/0.20/0.24/0.28, so they live on their own scale.
 */
export const SURFACE_STEPS = [980, 960, 950, 930, 280, 240, 200, 170, 140];
const SURFACE_CHROMA = 0.01;
function rampEntries(scale) {
    return Object.keys(scale)
        .map((key) => Number(key))
        .sort((a, b) => a - b)
        .map((step) => ({ step, color: scale[step] }));
}
function nearestByLightness(scale, targetL) {
    const entries = rampEntries(scale);
    let best = entries[0];
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const entry of entries) {
        const distance = Math.abs(entry.color.l - targetL);
        if (distance < bestDistance) {
            best = entry;
            bestDistance = distance;
        }
    }
    return best;
}
function aliasOf(palette, step) {
    return `{color.primitive.${palette}.${step}}`;
}
function entryToRole(palette, entry, description) {
    return {
        $value: aliasOf(palette, entry.step),
        $description: description,
        palette,
        step: entry.step,
        color: entry.color,
    };
}
/**
 * The steps of `scale` that clear every constraint.
 *
 * `solveDualMode` grades a pair of contexts at a time and reports
 * `stepsClearingBoth` — exactly the steps that clear both — so the contexts are
 * walked two at a time and the sets intersected; an odd trailing context is
 * graded against itself. A role rendered on three elevations is therefore held
 * to the worst of the three rather than to whichever one a designer named.
 */
function clearingSteps(scale, intent, constraints) {
    var _a;
    let clearing = null;
    for (const constraint of constraints) {
        for (let index = 0; index < constraint.contexts.length; index += 2) {
            const first = constraint.contexts[index];
            const second = ((_a = constraint.contexts[index + 1]) !== null && _a !== void 0 ? _a : first);
            const passing = solveDualMode({
                ramp: scale,
                intent,
                lightBackground: first,
                darkBackground: second,
                use: constraint.use,
            }).stepsClearingBoth;
            clearing =
                clearing === null
                    ? [...passing]
                    : clearing.filter((step) => passing.includes(step));
        }
    }
    return clearing !== null && clearing !== void 0 ? clearing : [];
}
function minRatio(color, contexts) {
    const hex = oklchToHex(color);
    let lowest = Number.POSITIVE_INFINITY;
    for (const context of contexts) {
        lowest = Math.min(lowest, contrastRatio(hex, context));
    }
    return lowest;
}
/**
 * The step nearest the designer's intent that clears `required` and, when any
 * step clears both tiers, `preferred` as well. Ties — the intent sitting
 * equidistant between two qualifying steps — go to the larger minimum ratio, so
 * the free choice buys headroom rather than ramp direction.
 *
 * When nothing clears `required` the intent step is returned unchanged. The
 * role stays populated and `auditTheme` reports the shortfall; silently
 * widening the floor or dropping the role would hide a real failure.
 */
function solvedEntry(scale, targetL, required, preferred = []) {
    const entries = rampEntries(scale);
    const intent = nearestByLightness(scale, targetL);
    const anchor = entries.findIndex((entry) => entry.step === intent.step);
    const withPreferred = preferred.length === 0
        ? []
        : clearingSteps(scale, intent.step, [...required, ...preferred]);
    const steps = withPreferred.length > 0
        ? withPreferred
        : clearingSteps(scale, intent.step, required);
    if (steps.length === 0)
        return intent;
    const contexts = [...required, ...preferred].flatMap((constraint) => constraint.contexts);
    let best = intent;
    let bestDistance = Number.POSITIVE_INFINITY;
    let bestHeadroom = Number.NEGATIVE_INFINITY;
    for (const step of steps) {
        const index = entries.findIndex((entry) => entry.step === step);
        const entry = entries[index];
        const distance = Math.abs(index - anchor);
        const headroom = minRatio(entry.color, contexts);
        if (distance < bestDistance || (distance === bestDistance && headroom > bestHeadroom)) {
            best = entry;
            bestDistance = distance;
            bestHeadroom = headroom;
        }
    }
    return best;
}
/** A role whose only requirement is the designer's lightness intent. */
function role(ramps, palette, targetL, description) {
    return entryToRole(palette, nearestByLightness(ramps[palette], targetL), description);
}
/** A role the AA gate constrains: the nearest step to intent that conforms. */
function gatedRole(ramps, palette, targetL, description, required, preferred = []) {
    return entryToRole(palette, solvedEntry(ramps[palette], targetL, required, preferred), description);
}
function surfaceRole(surface, targetL, description) {
    return entryToRole("surface", nearestByLightness(surface, targetL), description);
}
function gatedSurfaceRole(surface, targetL, description, required) {
    return entryToRole("surface", solvedEntry(surface, targetL, required), description);
}
function hexOf(semanticRole) {
    return oklchToHex(semanticRole.color);
}
/**
 * The elevation scale sits outside the tonal ramps: its lightnesses are fixed
 * by the ladders, not by a chroma curve, and it carries only the seed hue's
 * faintest tint (ALGORITHMS.md §7's `oklch(0.14 0.01 H_seed)`).
 */
export function buildSurfaceScale(hue) {
    const scale = {};
    for (const step of SURFACE_STEPS) {
        scale[step] = { l: step / 1000, c: SURFACE_CHROMA, h: hue };
    }
    return scale;
}
/** Reads the seed hue off the brand ramp's most saturated step, where hue is never powerless. */
function seedHue(ramps) {
    let hue = 0;
    let chroma = -1;
    for (const entry of rampEntries(ramps.brand)) {
        if (entry.color.c > chroma) {
            chroma = entry.color.c;
            hue = entry.color.h;
        }
    }
    return hue;
}
/**
 * Picks the neutral step — lightest or darkest available — that reads best on
 * `background`. WCAG 2.1 ratio decides, |Lc| breaks ties, so both engines gate
 * the choice.
 */
function onColorRole(ramps, background, description) {
    const entries = rampEntries(ramps.neutral);
    const darkest = entries[0];
    const lightest = entries[entries.length - 1];
    const backgroundHex = oklchToHex(background.color);
    const candidates = [darkest, lightest].map((entry) => {
        const hex = oklchToHex(entry.color);
        return {
            entry,
            ratio: contrastRatio(hex, backgroundHex),
            lc: Math.abs(apcaLc(hex, backgroundHex)),
        };
    });
    const [first, second] = candidates;
    const winner = second.ratio > first.ratio ||
        (second.ratio === first.ratio && second.lc > first.lc)
        ? second
        : first;
    return entryToRole("neutral", winner.entry, description);
}
/**
 * Designer intent per mode, in OKLCH lightness. Every gated role is snapped by
 * `solvedEntry` to the nearest step that actually clears its AA floor, so these
 * numbers say where the role wants to sit, not where it lands. They are chosen
 * close enough to a conforming step that the solver rarely has to move one —
 * which is what keeps `border.default` and `border.strong` from collapsing onto
 * the same step when both are pulled toward the same limit.
 *
 * Dark accents lighten into L 0.75-0.85 (ALGORITHMS.md §7); the ramp's chroma
 * curve desaturates them there, so no extra chroma handling is needed here.
 *
 * `border.focus` is not listed: it tracks `accent.base`, so the focus ring is
 * the brand accent rather than a fifth neutral. `border.focusOffset` tracks the
 * 01dp elevation, because the inner ring reads as the surface the control sits
 * on.
 */
const SCALES = {
    light: {
        elevation: LIGHT_ELEVATION_L,
        inverseBackground: 0.2,
        foreground: {
            primary: 0.22,
            secondary: 0.4,
            muted: 0.5,
            disabled: 0.72,
            onInverse: 0.98,
        },
        border: { subtle: 0.92, default: 0.58, strong: 0.46 },
        accent: { base: 0.52, hover: 0.46, active: 0.4, subtle: 0.94 },
        status: { base: 0.48, subtle: 0.94, border: 0.54 },
    },
    dark: {
        elevation: ELEVATION_L,
        inverseBackground: 0.95,
        foreground: {
            primary: 0.95,
            secondary: 0.8,
            muted: 0.64,
            disabled: 0.45,
            onInverse: 0.18,
        },
        border: { subtle: 0.24, default: 0.54, strong: 0.62 },
        accent: { base: 0.78, hover: 0.85, active: 0.72, subtle: 0.24 },
        status: { base: 0.78, subtle: 0.26, border: 0.58 },
    },
};
const ELEVATION_DESCRIPTIONS = [
    "00dp page canvas",
    "01dp cards and containers",
    "03dp raised buttons and elevated cards",
    "08dp nav drawers and tooltips",
    "24dp dialogs, modals and popovers",
];
const STATUS_PALETTES = ["success", "warning", "danger", "info"];
function capitalize(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
}
/**
 * Maps a full ramp set onto context-aware roles for one theme mode. Dark mode
 * is derived independently from the same primitives — it is never an inversion
 * of the light roles.
 *
 * Roles that WCAG 2.2 AA gates are solved against the colours they are actually
 * rendered on, in the order those colours become available: tinted backgrounds
 * before the text and borders that sit on them, fills before the focus ring
 * that outlines them. Roles WCAG does not regulate — `border.subtle`,
 * `foreground.disabled`, the hover and subtle fills — keep their intent step.
 */
export function buildSemanticRoles(ramps, mode, surface = buildSurfaceScale(seedHue(ramps))) {
    const scale = SCALES[mode];
    const elevation = scale.elevation;
    const background = {
        canvas: surfaceRole(surface, elevation[0], `${mode} ${ELEVATION_DESCRIPTIONS[0]}`),
        surface: surfaceRole(surface, elevation[1], `${mode} ${ELEVATION_DESCRIPTIONS[1]}`),
        raised: surfaceRole(surface, elevation[2], `${mode} ${ELEVATION_DESCRIPTIONS[2]}`),
        overlay: surfaceRole(surface, elevation[3], `${mode} ${ELEVATION_DESCRIPTIONS[3]}`),
        dialog: surfaceRole(surface, elevation[4], `${mode} ${ELEVATION_DESCRIPTIONS[4]}`),
        inverse: surfaceRole(surface, scale.inverseBackground, "Inverted surface for tooltips and high-emphasis banners"),
    };
    const canvasHex = hexOf(background.canvas);
    const surfaceHex = hexOf(background.surface);
    const raisedHex = hexOf(background.raised);
    const overlayHex = hexOf(background.overlay);
    const dialogHex = hexOf(background.dialog);
    const elevationHexes = [canvasHex, surfaceHex, raisedHex, dialogHex];
    const brandSubtle = role(ramps, "brand", scale.accent.subtle, "Tinted brand background");
    const secondarySubtle = role(ramps, "accent", scale.accent.subtle, "Tinted secondary background");
    const accentBase = gatedRole(ramps, "brand", scale.accent.base, "Primary brand action", [{ use: "body", contexts: [canvasHex, surfaceHex, hexOf(brandSubtle)] }]);
    const secondaryBase = gatedRole(ramps, "accent", scale.accent.base, "Secondary harmony action", [
        { use: "body", contexts: [hexOf(secondarySubtle)] },
        { use: "large", contexts: [canvasHex, surfaceHex] },
    ]);
    const accent = {
        brand: accentBase,
        brandHover: role(ramps, "brand", scale.accent.hover, "Primary brand action, hovered"),
        brandActive: role(ramps, "brand", scale.accent.active, "Primary brand action, pressed"),
        brandSubtle,
        onBrand: onColorRole(ramps, accentBase, "Text and icons on the brand action"),
        secondary: secondaryBase,
        secondaryHover: role(ramps, "accent", scale.accent.hover, "Secondary action, hovered"),
        secondarySubtle,
        onSecondary: onColorRole(ramps, secondaryBase, "Text and icons on the secondary action"),
    };
    const fillHexes = [hexOf(accentBase), hexOf(secondaryBase)];
    /**
     * The outer ring. It must clear 3:1 against every surface a focused control
     * can sit on; clearing the fills it outlines as well is preferred but not
     * always reachable, and the offset ring covers that adjacency instead.
     */
    const focus = gatedRole(ramps, "brand", scale.accent.base, "Focus indicator, outer ring (WCAG 2.2 SC 2.4.11 / 2.4.13)", [{ use: "ui", contexts: [...elevationHexes] }], [{ use: "ui", contexts: [...fillHexes] }]);
    /**
     * The inner ring, drawn between the control fill and the outer ring. It is
     * solved against both so the two adjacencies the user actually sees clear
     * 3:1 even when the outer ring cannot be separated from the fill directly.
     */
    const focusOffset = gatedSurfaceRole(surface, elevation[1], "Focus indicator, inner offset ring (WCAG 2.2 SC 2.4.13)", [{ use: "ui", contexts: [hexOf(focus), ...fillHexes] }]);
    const border = {
        subtle: role(ramps, "neutral", scale.border.subtle, "Hairline separator"),
        default: gatedRole(ramps, "neutral", scale.border.default, "Default control border", [{ use: "ui", contexts: [canvasHex, surfaceHex, raisedHex] }]),
        strong: gatedRole(ramps, "neutral", scale.border.strong, "Emphasised border", [{ use: "ui", contexts: [canvasHex, surfaceHex] }]),
        focus,
        focusOffset,
    };
    const foreground = {
        primary: gatedRole(ramps, "neutral", scale.foreground.primary, "Body and heading text", [
            { use: "body", contexts: [canvasHex, surfaceHex, raisedHex, overlayHex, dialogHex] },
        ]),
        secondary: gatedRole(ramps, "neutral", scale.foreground.secondary, "Supporting text", [
            { use: "body", contexts: [canvasHex, surfaceHex, raisedHex] },
        ]),
        muted: gatedRole(ramps, "neutral", scale.foreground.muted, "Placeholder and metadata text", [{ use: "body", contexts: [canvasHex, surfaceHex] }]),
        disabled: role(ramps, "neutral", scale.foreground.disabled, "Disabled control text"),
        onInverse: gatedRole(ramps, "neutral", scale.foreground.onInverse, "Text on the inverted surface", [{ use: "body", contexts: [hexOf(background.inverse)] }]),
    };
    const status = STATUS_PALETTES.reduce((accumulator, palette) => {
        const subtle = role(ramps, palette, scale.status.subtle, `${capitalize(palette)} tinted background`);
        const subtleHex = hexOf(subtle);
        const base = gatedRole(ramps, palette, scale.status.base, `${capitalize(palette)} state`, [{ use: "body", contexts: [subtleHex, canvasHex, surfaceHex] }]);
        accumulator[palette] = base;
        accumulator[`${palette}Subtle`] = subtle;
        accumulator[`${palette}Border`] = gatedRole(ramps, palette, scale.status.border, `${capitalize(palette)} border`, [{ use: "ui", contexts: [subtleHex, surfaceHex] }]);
        accumulator[`on${capitalize(palette)}`] = onColorRole(ramps, base, `Text and icons on the ${palette} state`);
        return accumulator;
    }, {});
    return { background, foreground, border, accent, status };
}
