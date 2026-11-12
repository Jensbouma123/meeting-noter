import type { SplitPaneSidebarWidth } from "@/components/ui/SplitPane/SplitPaneTypes";

/**
 * Tier widths at `md` and up. Standard Tailwind scale steps, so the classes
 * below are static and the pixel mirrors stay in lockstep with them.
 */
export const SIDEBAR_WIDTH_CLASS: Record<SplitPaneSidebarWidth, string> = {
  sm: "md:w-56",
  md: "md:w-64",
  lg: "md:w-80",
};

/**
 * Pixel mirrors of the tiers above (Tailwind spacing scale on the 4px unit:
 * `w-56` = 224, `w-64` = 256, `w-80` = 320). Named constants, never literals
 * at the call site; the clamp ends are the neighbouring scale steps.
 */
export const SIDEBAR_WIDTH_PX: Record<SplitPaneSidebarWidth, number> = {
  sm: 224,
  md: 256,
  lg: 320,
};

/** `w-48`: the narrowest usable sidebar. */
export const SIDEBAR_MIN_PX = 192;
/** `w-96`: past this the detail pane starves. */
export const SIDEBAR_MAX_PX = 384;
/** Arrow-key step: two spacing units. */
export const KEYBOARD_STEP_PX = 8;
/** Page-key step: eight spacing units. */
export const PAGE_STEP_PX = 32;
