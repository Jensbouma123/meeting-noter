import type { SizeTier } from "@/lib/sizing-tokens/tiers";

// Tabs.tsx
export const TAB_LIST_PADDING: Record<SizeTier, string> = {
  xxs: "p-0.5",
  xs: "p-0.5",
  sm: "p-1",
  md: "p-1",
  lg: "p-1.5",
  xl: "p-1.5",
  "2xl": "p-2",
  "3xl": "p-2",
};

export const TAB_LIST_GAP: Record<SizeTier, string> = {
  xxs: "gap-0.5",
  xs: "gap-0.5",
  sm: "gap-1",
  md: "gap-1",
  lg: "gap-1.5",
  xl: "gap-1.5",
  "2xl": "gap-2",
  "3xl": "gap-2",
};

export const TAB_RADIUS: Record<SizeTier, string> = {
  xxs: "rounded",
  xs: "rounded-md",
  sm: "rounded-md",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-lg",
  "2xl": "rounded-xl",
  "3xl": "rounded-xl",
};

export const TAB_PADDING: Record<SizeTier, string> = {
  xxs: "px-1.5 py-0.5",
  xs: "px-2 py-1",
  sm: "px-2.5 py-1",
  md: "px-3 py-1.5",
  lg: "px-3.5 py-1.5",
  xl: "px-4 py-2",
  "2xl": "px-5 py-2",
  "3xl": "px-6 py-2.5",
};
