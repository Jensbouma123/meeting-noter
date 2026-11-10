import type { HarmonyMode } from "../lib/color/index.js";
/**
 * The CSS-variable stylesheet for a seed and harmony — what a root layout (a
 * Server Component) renders in a `<style>` so a non-stock theme paints from CSS
 * and `<ThemeProvider stylesheet={{ seed, harmony }}>` never runs the solver in
 * the browser. It is `generateTheme(seed, { harmony }).css` minus the
 * `@import "./base.css"` line, which cannot resolve inside an inline style:
 * import `@jensbouma123/acciva-ui/styles/base` from the app's CSS instead.
 * Server-safe: pure, no React, no DOM.
 */
export declare function themeStylesheet(seed: string, harmony?: HarmonyMode): string;
