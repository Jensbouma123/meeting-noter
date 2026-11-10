import type { OKLCH, PaletteName, StepLabel } from "../types.js";
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
