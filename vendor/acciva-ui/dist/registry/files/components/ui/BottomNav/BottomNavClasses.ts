import type { BottomNavHideAt, BottomNavPosition } from "@/components/ui/BottomNav/BottomNavTypes";

export const MAX_ITEMS = 5;

export const POSITION_CLASSES: Record<BottomNavPosition, string> = {
  fixed: "fixed inset-x-0 bottom-0 z-30",
  static: "w-full shrink-0",
};

export const HIDE_AT_CLASSES: Record<BottomNavHideAt, string> = {
  never: "",
  sm: "sm:hidden",
  md: "md:hidden",
  lg: "lg:hidden",
  xl: "xl:hidden",
};

// `w-full min-w-0` keeps link and action items filling their `flex-1 min-w-0` cell
// without overflowing a 5-up bar; `[&_svg]:size-6` forces caller icons (often
// `size-4`/`size-5`) up to the 24px minimum so the glyph never shrinks below target.
export const ITEM_CLASS =
  "focus-ring flex h-full w-full min-h-11 min-w-0 flex-col items-center justify-center gap-0.5 px-1 py-2 text-xs font-medium transition-colors motion-feedback active:scale-99 [&_svg]:size-6 [&_svg]:shrink-0";

// Below ~22.5rem (360px) the bar goes icon-only: the label takes the `sr-only`
// visual hiding so it stays in the accessibility tree, and `aria-label` on the
// control keeps the accessible name byte-identical when the text is hidden.
export const LABEL_CLASS = "min-w-0 max-w-full truncate max-[22.5rem]:sr-only";
