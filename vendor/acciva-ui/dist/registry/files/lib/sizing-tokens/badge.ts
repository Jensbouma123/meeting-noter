import type { SizeTier } from "@/lib/sizing-tokens/tiers";

// Badge.tsx
export const BADGE_PADDING: Record<SizeTier, string> = {
  xxs: "px-1.5 py-0.5",
  xs: "px-2 py-0.5",
  sm: "px-2 py-0.5",
  md: "px-2.5 py-0.5",
  lg: "px-3 py-1",
  xl: "px-3.5 py-1",
  "2xl": "px-4 py-1.5",
  "3xl": "px-5 py-2",
};

export const BADGE_TEXT: Record<SizeTier, string> = {
  // 11px is the floor at the small tiers: no control or badge label renders
  // below it, matching `AccivaControlText` (the Button's `TEXT_SIZE.xxs`).
  xxs: "text-xxs",
  xs: "text-xxs",
  sm: "text-xxs",
  md: "text-xs",
  lg: "text-xsm",
  xl: "text-sm",
  "2xl": "text-base",
  "3xl": "text-lg",
};

export const BADGE_GAP: Record<SizeTier, string> = {
  xxs: "gap-0.5",
  xs: "gap-0.5",
  sm: "gap-1",
  md: "gap-1",
  lg: "gap-1.5",
  xl: "gap-1.5",
  "2xl": "gap-2",
  "3xl": "gap-2",
};

export const BADGE_ICON_SCALE_CLASS: Record<SizeTier, string> = {
  xxs: "[&_svg]:size-2 [&_svg]:[stroke-width:2.5]",
  xs: "[&_svg]:size-2.5 [&_svg]:[stroke-width:2.25]",
  sm: "[&_svg]:size-2.5 [&_svg]:[stroke-width:2]",
  md: "[&_svg]:size-3 [&_svg]:[stroke-width:1.75]",
  lg: "[&_svg]:size-3.5 [&_svg]:[stroke-width:1.5]",
  xl: "[&_svg]:size-4 [&_svg]:[stroke-width:1.5]",
  "2xl": "[&_svg]:size-4.5 [&_svg]:[stroke-width:1.25]",
  "3xl": "[&_svg]:size-5 [&_svg]:[stroke-width:1]",
};
