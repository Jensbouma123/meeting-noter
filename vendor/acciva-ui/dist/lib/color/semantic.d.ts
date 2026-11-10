import type { OKLCH, PaletteName, SemanticRampSet, StepLabel, SurfaceScale, ThemeMode } from "./types.js";
/**
 * Dark-mode elevation ladder (ALGORITHMS.md §7). Depth in dark mode is carried
 * by lightness, never by shadow, and the base canvas is never pure black.
 */
export declare const ELEVATION_L: readonly number[];
/**
 * The light (980/960/950/930) and dark (280/240/200/170/140) elevation ladders,
 * keyed by lightness x 1000. These are deliberately NOT members of RAMP_STEPS:
 * a tonal ramp only lands near them, and ALGORITHMS.md §7 fixes the dark ladder
 * at exactly 0.14/0.17/0.20/0.24/0.28, so they live on their own scale.
 */
export declare const SURFACE_STEPS: StepLabel[];
export type SurfacePalette = "surface";
export type SemanticRole = {
    readonly $value: string;
    readonly $description: string;
    readonly palette: PaletteName | SurfacePalette;
    readonly step: StepLabel;
    readonly color: OKLCH;
};
export type BackgroundRole = "canvas" | "surface" | "raised" | "overlay" | "dialog" | "inverse";
export type ForegroundRole = "primary" | "secondary" | "muted" | "disabled" | "onInverse";
/**
 * `focusOffset` is the inner ring of the two-tone focus indicator, not a second
 * focus colour: no single colour can clear 3:1 against both the control fill it
 * outlines and the surface behind it, so the indicator is drawn as
 * fill | focusOffset | focus | surface and every adjacency in that chain clears
 * SC 2.4.13's 3:1. See the focus-ring recipe below.
 */
export type BorderRole = "subtle" | "default" | "strong" | "focus" | "focusOffset";
export type AccentRole = "brand" | "brandHover" | "brandActive" | "brandSubtle" | "onBrand" | "secondary" | "secondaryHover" | "secondarySubtle" | "onSecondary";
export type StatusRole = "success" | "successSubtle" | "successBorder" | "onSuccess" | "warning" | "warningSubtle" | "warningBorder" | "onWarning" | "danger" | "dangerSubtle" | "dangerBorder" | "onDanger" | "info" | "infoSubtle" | "infoBorder" | "onInfo";
export type SemanticRoles = {
    readonly background: Readonly<Record<BackgroundRole, SemanticRole>>;
    readonly foreground: Readonly<Record<ForegroundRole, SemanticRole>>;
    readonly border: Readonly<Record<BorderRole, SemanticRole>>;
    readonly accent: Readonly<Record<AccentRole, SemanticRole>>;
    readonly status: Readonly<Record<StatusRole, SemanticRole>>;
};
/**
 * The elevation scale sits outside the tonal ramps: its lightnesses are fixed
 * by the ladders, not by a chroma curve, and it carries only the seed hue's
 * faintest tint (ALGORITHMS.md §7's `oklch(0.14 0.01 H_seed)`).
 */
export declare function buildSurfaceScale(hue: number): SurfaceScale;
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
export declare function buildSemanticRoles(ramps: SemanticRampSet, mode: ThemeMode, surface?: SurfaceScale): SemanticRoles;
