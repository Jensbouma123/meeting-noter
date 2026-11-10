import { type RefObject } from "react";
import { type Side } from "./computeArrow.js";
export declare function usePopoverPlacement(open: boolean, targetPlacement: Side, triggerRef: RefObject<HTMLElement | null>, anchorName: string, popoverRef: RefObject<HTMLDivElement | null>): "top" | "bottom" | "left" | "right";
