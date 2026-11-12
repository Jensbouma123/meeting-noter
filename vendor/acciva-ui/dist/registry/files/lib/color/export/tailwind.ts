import { TAILWIND_ALIASES } from "@/lib/color/ramp/index";
import { applyOverrides, flattenDocument, type FlatToken } from "@/lib/color/export/resolve/index";
import type { DtcgDocument } from "@/lib/color/tokens/index";
import type { ModeTokenOverrides } from "@/lib/color/export/resolve/index";

const DARK_SELECTOR = 'html[data-theme="dark"]';
const SYSTEM_DARK_SELECTOR = 'html:not([data-theme="light"])';

function declarations(tokens: readonly FlatToken[], indent: string): string {
  return tokens.map((token) => `${indent}${token.variable}: ${token.literal};`).join("\n");
}

/**
 * Tailwind v4 reads `@theme` to generate utilities, so the 26-step ramp is
 * republished under the conventional 50-950 alias names it expects.
 */
function paletteScale(primitive: readonly FlatToken[], indent: string): string {
  const byPalette = new Map<string, Map<string, FlatToken>>();
  for (const token of primitive) {
    const palette = token.path[2];
    const step = token.path[3];
    if (palette === undefined || step === undefined) continue;
    const steps = byPalette.get(palette) ?? new Map<string, FlatToken>();
    steps.set(step, token);
    byPalette.set(palette, steps);
  }

  const lines: string[] = [];
  for (const [palette, steps] of byPalette) {
    for (const alias of Object.keys(TAILWIND_ALIASES).map(Number).sort((a, b) => a - b)) {
      const step = TAILWIND_ALIASES[alias];
      const token = step === undefined ? undefined : steps.get(String(step));
      if (token === undefined) continue;
      lines.push(`${indent}--color-${palette}-${alias}: ${token.literal};`);
    }
  }
  return lines.join("\n");
}

export function exportTailwindTheme(
  doc: DtcgDocument,
  overrides?: ModeTokenOverrides,
): string {
  const flattened = flattenDocument(doc);
  const { primitive, light, dark } = applyOverrides(
    flattened,
    overrides ?? { light: {}, dark: {} },
  );
  return [
    "@theme {",
    paletteScale(primitive, "  "),
    "",
    declarations(light, "  "),
    "}",
    "",
    "@layer base {",
    `  ${DARK_SELECTOR} {`,
    declarations(dark, "    "),
    "  }",
    "",
    "  @media (prefers-color-scheme: dark) {",
    `    ${SYSTEM_DARK_SELECTOR} {`,
    declarations(dark, "      "),
    "    }",
    "  }",
    "}",
    "",
  ].join("\n");
}
