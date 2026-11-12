import type { HarmonyMode, Hex } from "@/lib/color/index";
import type { AppPalette } from "@/lib/theme-tokens/app-palette";
import { DEFAULT_RADIUS, RADIUS_BASE_VARIABLE, RADIUS_MAP, radiusVariables } from "@/lib/theme-tokens/radius";
import type { ThemeVariable } from "@/lib/theme-tokens/constants";
import { paletteVariables, semanticVariables } from "@/lib/theme-tokens/semantic-variables";

const THEME_DARK_SELECTOR = 'html[data-theme="dark"]';
const THEME_SYSTEM_DARK_SELECTOR = 'html:not([data-theme="light"])';

/**
 * One declaration pair per property: the hex fallback first, then the `oklch()`
 * value. Engines without CSS Color 4 keep the hex; engines with it take the
 * wider-gamut declaration that follows.
 */
function themeDeclarations(variables: readonly ThemeVariable[], indent: string): string {
  return variables
    .map((entry) => `${indent}${entry.name}: ${entry.hex};\n${indent}${entry.name}: ${entry.literal};`)
    .join("\n");
}

/** `--background` becomes the `--color-background` Tailwind generates utilities from. */
function themeBridgeAlias(entry: ThemeVariable): string {
  return `  --color${entry.name.slice(1)}: var(${entry.name});`;
}

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
export function buildThemeStylesheet(palette: AppPalette, meta: ThemeStylesheetMeta): string {
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
