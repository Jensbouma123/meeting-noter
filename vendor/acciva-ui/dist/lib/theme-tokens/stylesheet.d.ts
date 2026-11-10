import type { HarmonyMode, Hex } from "../color/index.js";
import type { AppPalette } from "./app-palette.js";
export type ThemeStylesheetMeta = {
    readonly seed: Hex;
    readonly harmony: HarmonyMode;
};
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
export declare function buildThemeStylesheet(palette: AppPalette, meta: ThemeStylesheetMeta): string;
