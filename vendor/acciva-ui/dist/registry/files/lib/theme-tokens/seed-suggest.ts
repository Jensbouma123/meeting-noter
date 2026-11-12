import { hexToOklch, type Hex } from "@/lib/color/index";
import { autoFixSeedForContrast } from "@/lib/theme-tokens/seed-fix";

export type SeedSuggestion = {
  readonly seed: Hex;
  readonly deltaE: number;
  readonly description: string;
};

/**
 * The nearest seed on the same hue and chroma line that can serve as the action
 * fill at its own lightness, so the alias solver never has to darken `500` away
 * from the colour the user picked. Only lightness moves, for the same reason
 * the engine's own solver only moves lightness: hue and chroma are the brand.
 */
export function suggestSeed(seed: Hex): SeedSuggestion | null {
  const fix = autoFixSeedForContrast(seed, "AA");
  if (!fix.adjusted) return null;
  const origin = hexToOklch(seed);
  return {
    seed: fix.seed,
    deltaE: fix.deltaE,
    description: `Holds hue ${Math.round(origin.h)}° and chroma ${origin.c.toFixed(3)} and moves only OKLCH lightness, so the seed itself carries white body text at WCAG 2.1 AA and APCA Lc 75.`,
  };
}
