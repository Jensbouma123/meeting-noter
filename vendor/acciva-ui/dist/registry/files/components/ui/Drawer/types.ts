import type { ReactNode } from "react";
import type { DismissConfirmation } from "@/components/ui/Modal/index";

export type DrawerLength = number | string;
export type DrawerModality = "modal" | "persistent";
export type DrawerSide = "bottom" | "left" | "right";
export type DrawerDetent = "peek" | "half" | "full";
export type DrawerAxis = "vertical" | "horizontal";

export const DRAWER_DETENTS = ["peek", "half", "full"] as const;

export interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children?: ReactNode;
  modality?: DrawerModality;
  side?: DrawerSide;
  detent?: DrawerDetent;
  defaultDetent?: DrawerDetent;
  minSize?: DrawerLength;
  defaultSize?: DrawerLength;
  maxSize?: DrawerLength;
  minHeight?: DrawerLength;
  defaultHeight?: DrawerLength;
  maxHeight?: DrawerLength;
  onSnapChange?: (sizePx: number, detent: DrawerDetent) => void;
  connectToBottomNav?: boolean;
  safeAreaPadding?: boolean;
  confirmDismissal?: DismissConfirmation;
  draggable?: boolean;
  swipeToDismiss?: boolean;
  handleLabel?: string;
  closeLabel?: string;
  showCloseOnTouch?: boolean;
  className?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
}
