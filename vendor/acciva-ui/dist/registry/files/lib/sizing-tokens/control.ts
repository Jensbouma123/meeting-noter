import { SIZE_TIERS, type SizeTier } from "@/lib/sizing-tokens/tiers";

export const CONTROL_HEIGHT: Record<SizeTier, string> = {
  xxs: "h-6",
  xs: "h-7",
  sm: "h-8",
  md: "h-10",
  lg: "h-12",
  xl: "h-14",
  "2xl": "h-16",
  "3xl": "h-18",
};

// Control height in px, parsed from CONTROL_HEIGHT (Tailwind `h-N` = N * 4px) so
// the tier table stays the single source.
const controlHeightPx = (tier: SizeTier): number => Number(CONTROL_HEIGHT[tier].slice(2)) * 4;

export const TOUCH_TARGET_MIN_PX = 44;

// Every tier whose control is visually shorter than the 44x44px target
// (WCAG 2.5.5) — derived, so a height change can never desync the list.
// Pair with `touchTargetClass`.
export const TOUCH_TARGET_TIERS: readonly SizeTier[] = SIZE_TIERS.filter(
  (tier) => controlHeightPx(tier) < TOUCH_TARGET_MIN_PX,
);

// Expands the hit area to 44x44px on touch devices only, via an invisible
// absolutely-positioned pseudo-element (see .touch-target-44 in globals.css).
// Never changes visual size — safe to apply unconditionally alongside any
// other layout classes.
export const TOUCH_TARGET_CLASS = "touch-target-44";

export function needsTouchTarget(size: SizeTier): boolean {
  return TOUCH_TARGET_TIERS.includes(size);
}

export function touchTargetClass(size: SizeTier): string | undefined {
  return needsTouchTarget(size) ? TOUCH_TARGET_CLASS : undefined;
}

// Same scale as CONTROL_HEIGHT, kept as a literal record (rather than
// derived via string replacement) so Tailwind's JIT scanner can see the
// class names — used to make icon-only buttons square.
export const CONTROL_WIDTH: Record<SizeTier, string> = {
  xxs: "w-6",
  xs: "w-7",
  sm: "w-8",
  md: "w-10",
  lg: "w-12",
  xl: "w-14",
  "2xl": "w-16",
  "3xl": "w-18",
};

export const CONTROL_PADDING_X: Record<SizeTier, string> = {
  xxs: "px-2",
  xs: "px-2.5",
  sm: "px-3",
  md: "px-4",
  lg: "px-5",
  xl: "px-6",
  "2xl": "px-7",
  "3xl": "px-8",
};

export const CONTROL_GAP: Record<SizeTier, string> = {
  xxs: "gap-1",
  xs: "gap-1",
  sm: "gap-1.5",
  md: "gap-2",
  lg: "gap-2",
  xl: "gap-2.5",
  "2xl": "gap-3",
  "3xl": "gap-3.5",
};

export const CONTROL_RADIUS: Record<SizeTier, string> = {
  xxs: "rounded-md",
  xs: "rounded-md",
  sm: "rounded-lg",
  md: "rounded-lg",
  lg: "rounded-lg",
  xl: "rounded-xl",
  "2xl": "rounded-xl",
  "3xl": "rounded-2xl",
};
