import { useEffect } from "react";
import type { DrawerProps } from "@/components/ui/Drawer/types";

/** Development-only authoring checks; production builds skip both effects. */
export function useDrawerDevWarnings(
  open: boolean,
  isPersistent: boolean,
  side: NonNullable<DrawerProps["side"]>,
  ariaLabel: DrawerProps["aria-label"],
  ariaLabelledBy: DrawerProps["aria-labelledby"],
): void {
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    if (open && !ariaLabel && !ariaLabelledBy) {
      console.warn(
        "[a11y] <Drawer> has no accessible name. Pass aria-label or aria-labelledby so screen readers can announce what opened.",
      );
    }
  }, [open, ariaLabel, ariaLabelledBy]);

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    if (open && isPersistent && side !== "bottom") {
      console.warn(
        `[Drawer] modality="persistent" ignores side="${side}"; a persistent drawer is a bottom sheet that docks to the inline end at md: and up.`,
      );
    }
  }, [open, isPersistent, side]);
}
