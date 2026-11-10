import type { DrawerProps } from "./types.js";
/** Development-only authoring checks; production builds skip both effects. */
export declare function useDrawerDevWarnings(open: boolean, isPersistent: boolean, side: NonNullable<DrawerProps["side"]>, ariaLabel: DrawerProps["aria-label"], ariaLabelledBy: DrawerProps["aria-labelledby"]): void;
