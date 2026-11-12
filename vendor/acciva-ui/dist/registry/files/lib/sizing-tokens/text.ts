import type { SizeTier } from "@/lib/sizing-tokens/tiers";

// Type-only micro tier below `xxs`, for dense metadata labels (swatch values,
// axis ticks, table sub-headers) that are never a component's `size` prop —
// `SIZE_TIERS` deliberately does not gain a member, so no component's `size`
// contract widens. 10px is the floor: nothing smaller ships (SC 1.4.4).
export type TextSizeTier = "3xs" | SizeTier;

export const TEXT_SIZE_TIERS = [
  "3xs",
  "xxs",
  "xs",
  "sm",
  "md",
  "lg",
  "xl",
  "2xl",
  "3xl",
] as const satisfies readonly TextSizeTier[];

export const TEXT_SIZE: Record<TextSizeTier, string> = {
  "3xs": "text-3xs",
  xxs: "text-xxs",
  xs: "text-xs",
  sm: "text-xsm",
  md: "text-sm",
  lg: "text-base",
  xl: "text-lg",
  "2xl": "text-xl",
  "3xl": "text-2xl",
};
