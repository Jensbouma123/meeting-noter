/**
 * Dual-mode WCAG 2.2 AA gate.
 *
 * A theme is only shippable when it clears AA in light **and** dark
 * simultaneously, so the audit grades one fixed table of role pairs against
 * both mode's resolved values and returns a single verdict.
 *
 * **The gate is the WCAG 2.2 contrast ratio and nothing else.** `pass` is
 * exactly `ratio >= required` (4.5 for body text, 3.0 for large text, UI
 * components, graphical objects and focus indicators). APCA `Lc` is reported
 * alongside every pair as advisory information — it is a WCAG 3 draft metric on
 * a perceptual scale, it is not a conformance requirement, and it must never
 * decide `pass`, `failures` or `passesAA`. This is why the audit does not use
 * `evaluatePair` from `contrast.ts` or `adjustForContrast` from `solve.ts`:
 * both AND the two engines together, which would fail a pair that conforms to
 * WCAG 2.2 AA.
 *
 * Values are read back through the emitted token graph rather than from
 * `buildSemanticRoles` directly, so the audit grades the colours that actually
 * ship — including the alias indirection and the `precision` rounding applied
 * on the way out.
 */
import { apcaLc, apcaLevel, contrastRatio, wcagLevel, WCAG_THRESHOLDS, } from "./contrast.js";
import { flattenDocument } from "./export/resolve.js";
import { buildTokenGraph } from "./tokens.js";
const TEXT_SC = ["1.4.3"];
const LARGE_TEXT_SC = ["1.4.3"];
const NON_TEXT_SC = ["1.4.11"];
const FOCUS_SC = ["2.4.13", "1.4.11"];
const UNREGULATED = [];
function statusPairs(palette, label) {
    const subtle = `status.${palette}Subtle`;
    const border = `status.${palette}Border`;
    const base = `status.${palette}`;
    const on = `status.on${label}`;
    const lower = palette;
    return [
        {
            id: `${lower}-on-subtle`,
            label: `${label} text on its own tinted surface`,
            foreground: base,
            background: subtle,
            use: "body",
            sc: TEXT_SC,
            adjustable: "foreground",
        },
        {
            id: `on-${lower}-on-fill`,
            label: `Label on the solid ${lower} fill`,
            foreground: on,
            background: base,
            use: "body",
            sc: TEXT_SC,
            adjustable: "foreground",
        },
        {
            id: `${lower}-on-canvas`,
            label: `${label} text on the page canvas`,
            foreground: base,
            background: "background.canvas",
            use: "body",
            sc: TEXT_SC,
            adjustable: "foreground",
        },
        {
            id: `${lower}-on-surface`,
            label: `${label} text on a card surface`,
            foreground: base,
            background: "background.surface",
            use: "body",
            sc: TEXT_SC,
            adjustable: "foreground",
        },
        {
            id: `${lower}-border-on-subtle`,
            label: `${label} border against its own tinted surface`,
            foreground: border,
            background: subtle,
            use: "ui",
            sc: NON_TEXT_SC,
            adjustable: "foreground",
        },
        {
            id: `${lower}-border-on-surface`,
            label: `${label} border against a card surface`,
            foreground: border,
            background: "background.surface",
            use: "ui",
            sc: NON_TEXT_SC,
            adjustable: "foreground",
        },
    ];
}
/**
 * Every role pair a theme must clear to conform to WCAG 2.2 AA, in both modes.
 *
 * A given (foreground, background) role pair appears **once**, at the strictest
 * use that applies to it — a pair held to 4.5:1 as body text passes the 3:1
 * non-text floor by construction, so listing it twice would only inflate the
 * table.
 *
 * This table supersedes `PAIR_SPECS` / `ROLE_THRESHOLDS` in
 * `src/lib/theme-tokens.ts` and deliberately diverges from it in four places:
 *
 * - **Borders are 3:1, not 1.8:1.** `ROLE_THRESHOLDS.border.aa.ratio` is 1.8,
 *   which is not a WCAG number. SC 1.4.11 requires 3:1 for the boundary of a
 *   UI component. The border roles are split by function instead of relaxed:
 *   `border.default` and `border.strong` delimit controls and are gated at 3:1;
 *   `border.subtle` is a hairline separator — neither a control boundary nor a
 *   graphical object needed to understand content — so it is listed as
 *   `decorative`, cites no SC, and is measured but never gated.
 * - **No lightness pass-override.** `theme-tokens.ts` lets a dark border count
 *   as passing when its OKLCH lightness happens to fall in 0.28–0.40,
 *   regardless of the ratio. That fabricates conformance. Here `pass` is
 *   `ratio >= required`, always, with no escape hatch.
 * - **The focus indicator is graded along the whole painted chain**, not only
 *   against the canvas and card surface. SC 2.4.13 requires the indicator to
 *   contrast with adjacent colours, and the control fill it outlines is one of
 *   them. The theme ships a two-tone ring, so that chain is
 *   `fill | border.focusOffset | border.focus | surface` and the adjacencies a
 *   sighted keyboard user can see are fill↔offset, offset↔focus and
 *   focus↔surface. All seven are gated at 3:1, each between the two colours
 *   that actually touch. Grading `border.focus` straight against the fill would
 *   measure an inset ring the theme does not paint, and in dark mode no colour
 *   can satisfy it — see the focus-ring recipe in `.agents/lib/color-engine.md`.
 * - **Info status is covered.** `PAIR_SPECS` has badge pairs for success,
 *   warning and danger but not info; all four are enumerated here.
 *
 * `foreground.disabled` is exempt: SC 1.4.3 and SC 1.4.11 both exclude
 * inactive user interface components, so no AA floor is mandatory. The rows are
 * kept at the 3:1 large-text floor as a house minimum, marked `exempt`, so a
 * designer sees the number without it turning `passesAA` into a stricter
 * verdict than WCAG 2.2 AA actually is.
 */
export const REQUIRED_PAIRS = [
    {
        id: "body-on-canvas",
        label: "Body text on the page canvas",
        foreground: "foreground.primary",
        background: "background.canvas",
        use: "body",
        sc: TEXT_SC,
        adjustable: "foreground",
    },
    {
        id: "body-on-surface",
        label: "Body text on a card surface (01dp)",
        foreground: "foreground.primary",
        background: "background.surface",
        use: "body",
        sc: TEXT_SC,
        adjustable: "foreground",
    },
    {
        id: "body-on-raised",
        label: "Body text on a raised surface (03dp)",
        foreground: "foreground.primary",
        background: "background.raised",
        use: "body",
        sc: TEXT_SC,
        adjustable: "foreground",
    },
    {
        id: "body-on-overlay",
        label: "Body text on an overlay surface (08dp)",
        foreground: "foreground.primary",
        background: "background.overlay",
        use: "body",
        sc: TEXT_SC,
        adjustable: "foreground",
    },
    {
        id: "body-on-dialog",
        label: "Body text on a dialog surface (24dp)",
        foreground: "foreground.primary",
        background: "background.dialog",
        use: "body",
        sc: TEXT_SC,
        adjustable: "foreground",
    },
    {
        id: "secondary-on-canvas",
        label: "Supporting text on the page canvas",
        foreground: "foreground.secondary",
        background: "background.canvas",
        use: "body",
        sc: TEXT_SC,
        adjustable: "foreground",
    },
    {
        id: "secondary-on-surface",
        label: "Supporting text on a card surface",
        foreground: "foreground.secondary",
        background: "background.surface",
        use: "body",
        sc: TEXT_SC,
        adjustable: "foreground",
    },
    {
        id: "secondary-on-raised",
        label: "Supporting text on a raised surface",
        foreground: "foreground.secondary",
        background: "background.raised",
        use: "body",
        sc: TEXT_SC,
        adjustable: "foreground",
    },
    {
        id: "muted-on-canvas",
        label: "Placeholder and metadata text on the page canvas",
        foreground: "foreground.muted",
        background: "background.canvas",
        use: "body",
        sc: TEXT_SC,
        adjustable: "foreground",
    },
    {
        id: "muted-on-surface",
        label: "Placeholder and metadata text on a card surface",
        foreground: "foreground.muted",
        background: "background.surface",
        use: "body",
        sc: TEXT_SC,
        adjustable: "foreground",
    },
    {
        id: "on-inverse-on-inverse",
        label: "Text on the inverted surface",
        foreground: "foreground.onInverse",
        background: "background.inverse",
        use: "body",
        sc: TEXT_SC,
        adjustable: "foreground",
    },
    {
        id: "brand-link-on-canvas",
        label: "Inline brand link on the page canvas",
        foreground: "accent.brand",
        background: "background.canvas",
        use: "body",
        sc: TEXT_SC,
        adjustable: "foreground",
    },
    {
        id: "brand-link-on-surface",
        label: "Inline brand link on a card surface",
        foreground: "accent.brand",
        background: "background.surface",
        use: "body",
        sc: TEXT_SC,
        adjustable: "foreground",
    },
    {
        id: "on-brand-on-brand",
        label: "Label on the brand action",
        foreground: "accent.onBrand",
        background: "accent.brand",
        use: "body",
        sc: TEXT_SC,
        adjustable: "foreground",
    },
    {
        id: "on-brand-on-brand-hover",
        label: "Label on the brand action, hovered",
        foreground: "accent.onBrand",
        background: "accent.brandHover",
        use: "body",
        sc: TEXT_SC,
        adjustable: "foreground",
    },
    {
        id: "on-brand-on-brand-active",
        label: "Label on the brand action, pressed",
        foreground: "accent.onBrand",
        background: "accent.brandActive",
        use: "body",
        sc: TEXT_SC,
        adjustable: "foreground",
    },
    {
        id: "brand-on-brand-subtle",
        label: "Brand label on the tinted brand background",
        foreground: "accent.brand",
        background: "accent.brandSubtle",
        use: "body",
        sc: TEXT_SC,
        adjustable: "foreground",
    },
    {
        id: "on-secondary-on-secondary",
        label: "Label on the secondary action",
        foreground: "accent.onSecondary",
        background: "accent.secondary",
        use: "body",
        sc: TEXT_SC,
        adjustable: "foreground",
    },
    {
        id: "on-secondary-on-secondary-hover",
        label: "Label on the secondary action, hovered",
        foreground: "accent.onSecondary",
        background: "accent.secondaryHover",
        use: "body",
        sc: TEXT_SC,
        adjustable: "foreground",
    },
    {
        id: "secondary-on-secondary-subtle",
        label: "Secondary label on the tinted secondary background",
        foreground: "accent.secondary",
        background: "accent.secondarySubtle",
        use: "body",
        sc: TEXT_SC,
        adjustable: "foreground",
    },
    ...statusPairs("success", "Success"),
    ...statusPairs("warning", "Warning"),
    ...statusPairs("danger", "Danger"),
    ...statusPairs("info", "Info"),
    {
        id: "accent-heading-on-canvas",
        label: "Large secondary-accent heading on the page canvas",
        foreground: "accent.secondary",
        background: "background.canvas",
        use: "large",
        sc: LARGE_TEXT_SC,
        adjustable: "foreground",
    },
    {
        id: "accent-heading-on-surface",
        label: "Large secondary-accent heading on a card surface",
        foreground: "accent.secondary",
        background: "background.surface",
        use: "large",
        sc: LARGE_TEXT_SC,
        adjustable: "foreground",
    },
    {
        id: "border-control-on-canvas",
        label: "Control border against the page canvas",
        foreground: "border.default",
        background: "background.canvas",
        use: "ui",
        sc: NON_TEXT_SC,
        adjustable: "foreground",
    },
    {
        id: "border-control-on-surface",
        label: "Control border against a card surface",
        foreground: "border.default",
        background: "background.surface",
        use: "ui",
        sc: NON_TEXT_SC,
        adjustable: "foreground",
    },
    {
        id: "border-control-on-raised",
        label: "Control border against a raised surface",
        foreground: "border.default",
        background: "background.raised",
        use: "ui",
        sc: NON_TEXT_SC,
        adjustable: "foreground",
    },
    {
        id: "border-strong-on-canvas",
        label: "Emphasised border against the page canvas",
        foreground: "border.strong",
        background: "background.canvas",
        use: "ui",
        sc: NON_TEXT_SC,
        adjustable: "foreground",
    },
    {
        id: "border-strong-on-surface",
        label: "Emphasised border against a card surface",
        foreground: "border.strong",
        background: "background.surface",
        use: "ui",
        sc: NON_TEXT_SC,
        adjustable: "foreground",
    },
    {
        id: "border-subtle-on-canvas",
        label: "Hairline separator against the page canvas",
        foreground: "border.subtle",
        background: "background.canvas",
        use: "decorative",
        sc: UNREGULATED,
        adjustable: "foreground",
        exempt: true,
    },
    {
        id: "border-subtle-on-surface",
        label: "Hairline separator against a card surface",
        foreground: "border.subtle",
        background: "background.surface",
        use: "decorative",
        sc: UNREGULATED,
        adjustable: "foreground",
        exempt: true,
    },
    {
        id: "focus-on-canvas",
        label: "Focus indicator against the page canvas",
        foreground: "border.focus",
        background: "background.canvas",
        use: "ui",
        sc: FOCUS_SC,
        adjustable: "foreground",
    },
    {
        id: "focus-on-surface",
        label: "Focus indicator against a card surface",
        foreground: "border.focus",
        background: "background.surface",
        use: "ui",
        sc: FOCUS_SC,
        adjustable: "foreground",
    },
    {
        id: "focus-on-raised",
        label: "Focus indicator against a raised surface",
        foreground: "border.focus",
        background: "background.raised",
        use: "ui",
        sc: FOCUS_SC,
        adjustable: "foreground",
    },
    {
        id: "focus-on-dialog",
        label: "Focus indicator against a dialog surface",
        foreground: "border.focus",
        background: "background.dialog",
        use: "ui",
        sc: FOCUS_SC,
        adjustable: "foreground",
    },
    {
        id: "focus-on-focus-offset",
        label: "Focus indicator against the offset ring inside it",
        foreground: "border.focus",
        background: "border.focusOffset",
        use: "ui",
        sc: FOCUS_SC,
        // The engine solves the outer ring against the four surfaces first, then
        // cuts the offset ring to clear it and both fills, so the offset ring — the
        // background here — is the side a solver may move.
        adjustable: "background",
    },
    {
        id: "focus-offset-on-brand-fill",
        label: "Focus offset ring against the brand control fill it outlines",
        foreground: "border.focusOffset",
        background: "accent.brand",
        use: "ui",
        sc: FOCUS_SC,
        adjustable: "foreground",
    },
    {
        id: "focus-offset-on-secondary-fill",
        label: "Focus offset ring against the secondary control fill it outlines",
        foreground: "border.focusOffset",
        background: "accent.secondary",
        use: "ui",
        sc: FOCUS_SC,
        adjustable: "foreground",
    },
    {
        id: "disabled-on-canvas",
        label: "Disabled control text on the page canvas",
        foreground: "foreground.disabled",
        background: "background.canvas",
        use: "large",
        sc: TEXT_SC,
        adjustable: "foreground",
        exempt: true,
    },
    {
        id: "disabled-on-surface",
        label: "Disabled control text on a card surface",
        foreground: "foreground.disabled",
        background: "background.surface",
        use: "large",
        sc: TEXT_SC,
        adjustable: "foreground",
        exempt: true,
    },
];
/** Body text is the only use held to the 4.5:1 scale; everything else is the 3:1 scale. */
function isLargeScale(use) {
    return use !== "body";
}
/**
 * Grade one pair from explicit hexes. Exposed so a caller that already has
 * resolved colours — an override editor, a test — can reuse the exact gate the
 * theme audit applies, without rebuilding a token graph.
 *
 * `pass` is `ratio >= required` with no other term. There is no lightness
 * window, no polarity special case and no APCA clause that can turn a failing
 * ratio into a pass.
 */
export function gradePair(pair, mode, foreground, background) {
    const ratio = contrastRatio(foreground, background);
    const required = WCAG_THRESHOLDS[pair.use];
    const lc = apcaLc(foreground, background);
    return {
        id: pair.id,
        label: pair.label,
        mode,
        use: pair.use,
        foregroundRole: pair.foreground,
        backgroundRole: pair.background,
        foreground,
        background,
        ratio,
        required,
        level: wcagLevel(ratio, isLargeScale(pair.use)),
        pass: ratio >= required,
        exempt: pair.exempt === true,
        sc: pair.sc,
        adjustable: pair.adjustable,
        apca: { lc, tier: apcaLevel(lc) },
    };
}
const SEMANTIC_LAYER_INDEX = 1;
const ROLE_PATH_START = 3;
function roleIndex(tokens) {
    const index = new Map();
    for (const token of tokens) {
        if (token.path[SEMANTIC_LAYER_INDEX] !== "semantic")
            continue;
        const key = token.path.slice(ROLE_PATH_START).join(".");
        if (key.length === 0)
            continue;
        index.set(key, { hex: token.hex, color: token.color });
    }
    return index;
}
function requireRole(index, path, mode) {
    const resolved = index.get(path);
    if (resolved === undefined) {
        throw new Error(`Required pair references unknown ${mode} role ${path}`);
    }
    return resolved;
}
function gradeMode(index, mode) {
    return REQUIRED_PAIRS.map((pair) => gradePair(pair, mode, requireRole(index, pair.foreground, mode).hex, requireRole(index, pair.background, mode).hex));
}
/**
 * Grade an already-built token graph. Use this over {@link auditTheme} when the
 * caller holds a graph already — building one is ~14 ramps of work.
 */
export function auditTokenGraph(doc, seed = "") {
    const flat = flattenDocument(doc);
    const light = gradeMode(roleIndex(flat.light), "light");
    const dark = gradeMode(roleIndex(flat.dark), "dark");
    const failures = [...light, ...dark].filter((result) => !result.pass && !result.exempt);
    return { seed, light, dark, failures, passesAA: failures.length === 0 };
}
/**
 * Audit a seed colour's generated theme against WCAG 2.2 AA in both modes.
 * `passesAA` is true only when every non-exempt pair clears its ratio in light
 * *and* dark — a theme that conforms in one mode only does not pass.
 */
export function auditTheme(seed, opts = {}) {
    return auditTokenGraph(buildTokenGraph(seed, opts), seed);
}
