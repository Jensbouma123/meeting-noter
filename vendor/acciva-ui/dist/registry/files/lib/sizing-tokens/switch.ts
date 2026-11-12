import type { SizeTier } from "@/lib/sizing-tokens/tiers";

// Switch.tsx — thumb diameter is always (track height - 4px), and track
// width is (2 * thumb + 4px), so the thumb has a constant 2px margin on
// every side in both the checked and unchecked positions at every tier.
export const SWITCH_TRACK: Record<SizeTier, string> = {
  xxs: "h-3.5 w-6 p-0.5",
  xs: "h-4 w-7 p-0.5",
  sm: "h-5 w-9 p-0.5",
  md: "h-6 w-11 p-0.5",
  lg: "h-7 w-13 p-0.5",
  xl: "h-8 w-15 p-0.5",
  "2xl": "h-9 w-17 p-0.5",
  "3xl": "h-10 w-19 p-0.5",
};

export const SWITCH_THUMB: Record<SizeTier, string> = {
  xxs: "size-2.5",
  xs: "size-3",
  sm: "size-4",
  md: "size-5",
  lg: "size-6",
  xl: "size-7",
  "2xl": "size-8",
  "3xl": "size-9",
};

// Distance the thumb travels when checked to reach the exact right edge with 2px padding
export const SWITCH_THUMB_TRANSLATE: Record<SizeTier, string> = {
  xxs: "translate-x-2.5",
  xs: "translate-x-3",
  sm: "translate-x-4",
  md: "translate-x-5",
  lg: "translate-x-6",
  xl: "translate-x-7",
  "2xl": "translate-x-8",
  "3xl": "translate-x-9",
};
