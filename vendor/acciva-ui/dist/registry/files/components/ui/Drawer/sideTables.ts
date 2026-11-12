import type { DrawerAxis, DrawerDetent, DrawerSide } from "@/components/ui/Drawer/types";

export const SIDE_AXIS: Readonly<Record<DrawerSide, DrawerAxis>> = {
  bottom: "vertical",
  left: "horizontal",
  right: "horizontal",
};

export const GROW_KEYS: Readonly<Record<DrawerSide, readonly string[]>> = {
  bottom: ["ArrowUp", "ArrowRight"],
  left: ["ArrowUp", "ArrowRight"],
  right: ["ArrowUp", "ArrowLeft"],
};

export const SHRINK_KEYS: Readonly<Record<DrawerSide, readonly string[]>> = {
  bottom: ["ArrowDown", "ArrowLeft"],
  left: ["ArrowDown", "ArrowLeft"],
  right: ["ArrowDown", "ArrowRight"],
};

export const DETENT_LABEL: Readonly<Record<DrawerDetent, string>> = {
  peek: "Peek",
  half: "Half open",
  full: "Fully open",
};
