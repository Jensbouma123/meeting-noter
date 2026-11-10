import type { CSSProperties, KeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import { type ColorFormat, type HSLA, type HSVA, type RGBA } from "../../../lib/color/formats/index.js";
import type { ColorSwatch } from "./types.js";
export declare const DOCKED_MEDIA_QUERY = "(min-width: 768px)";
export declare const PANEL_TITLE = "Choose color";
export declare const LARGE_STEP = 10;
export declare const LIGHT_GLYPH_LUMINANCE = 0.179;
export declare const FORMATS: readonly ColorFormat[];
export declare const HUE_GRADIENT: string;
export declare const CHECKERBOARD = "repeating-conic-gradient(var(--color-neutral-200) 0% 25%, var(--color-neutral-50) 0% 50%)";
export declare const CHECKER_TILE = "calc(var(--spacing) * 4) calc(var(--spacing) * 4)";
export declare const THUMB_PAINT = "pointer-events-none block rounded-full border-2 border-neutral-50 shadow ring-1 ring-neutral-950";
export declare function roundRgba({ r, g, b, a }: RGBA): RGBA;
export declare function roundHsla({ h, s, l, a }: HSLA): HSLA;
export declare function toHsva(rgba: RGBA, fallbackHue: number): HSVA;
export declare function hsvaFromValue(value: string, allowAlpha: boolean, fallbackHue: number): HSVA;
export declare function cssColor(rgba: RGBA): string;
export declare function checkeredFill(rgba: RGBA): CSSProperties;
export interface ResolvedSwatch {
    label: string;
    rgba: RGBA;
}
export declare function resolveSwatches(swatches: readonly (string | ColorSwatch)[] | undefined): ResolvedSwatch[];
export declare function trackDrag(event: ReactPointerEvent<HTMLElement>, element: HTMLElement | null, onPoint: (x: number, y: number) => void): void;
export declare function stepFor(event: KeyboardEvent): 10 | 1;
