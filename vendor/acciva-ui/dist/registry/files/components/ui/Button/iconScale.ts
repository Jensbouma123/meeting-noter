import type { SizeTier } from "@/lib/sizing-tokens/index";

// Button's own icon slot: a direct child svg (leading/trailing icon, spinner). An svg nested
// deeper (an avatar or custom child) keeps its own size. Literal strings for Tailwind's scanner.
// `stroke-<n>` is Tailwind's numeric stroke-width utility (no arbitrary-property brackets).
export const BUTTON_ICON_SCALE: Record<SizeTier, string> = {
  xxs: "[&>svg]:size-3 [&>svg]:stroke-2.5",
  xs: "[&>svg]:size-3.5 [&>svg]:stroke-2.25",
  sm: "[&>svg]:size-4 [&>svg]:stroke-2",
  md: "[&>svg]:size-4 [&>svg]:stroke-1.75",
  lg: "[&>svg]:size-4.5 [&>svg]:stroke-1.5",
  xl: "[&>svg]:size-5 [&>svg]:stroke-1.5",
  "2xl": "[&>svg]:size-6 [&>svg]:stroke-1.25",
  "3xl": "[&>svg]:size-7 [&>svg]:stroke-1",
};
