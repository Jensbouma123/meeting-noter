import type { SizeTier } from "@/lib/sizing-tokens/tiers";

// Floor height for a docs/demo stage that must not collapse before its content
// loads. Every stop is an exact multiple of Tailwind's spacing unit, so the six
// arbitrary `min-h-[Npx]` stages in the app each land on a tier unchanged:
// 120px -> xs, 160px -> sm, 380px -> xl, 580px -> 2xl, 640px -> 3xl.
export const PREVIEW_MIN_HEIGHT: Record<SizeTier, string> = {
  xxs: "min-h-24",
  xs: "min-h-30",
  sm: "min-h-40",
  md: "min-h-60",
  lg: "min-h-80",
  xl: "min-h-95",
  "2xl": "min-h-145",
  "3xl": "min-h-160",
};
