import { type ReactNode } from "react";
import { type DismissConfirmation } from "../../components/ui/Modal.js";
export type DrawerLength = number | string;
export type DrawerModality = "modal" | "persistent";
export type DrawerSide = "bottom" | "left" | "right";
export type DrawerDetent = "peek" | "half" | "full";
export type DrawerAxis = "vertical" | "horizontal";
export declare const DRAWER_DETENTS: readonly ["peek", "half", "full"];
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
export declare function resolveLength(value: DrawerLength, referenceEl: HTMLElement | null, axis?: DrawerAxis): number;
export declare function pickSnapTarget(height: number, velocity: number, points: number[], travelDistance?: number): number;
/**
 * Detent-space counterpart to {@link pickSnapTarget}: returns the index of the detent a
 * release at `size` should land on. Ties break toward the detent already selected, so
 * duplicate detent sizes never make the panel appear to jump.
 */
export declare function pickDetentTarget(size: number, velocity: number, detentSizes: readonly number[], travelDistance?: number, currentIndex?: number): number;
export interface ResolveDetentSizesOptions {
    available: number;
    referenceEl: HTMLElement | null;
    axis: DrawerAxis;
    modality: DrawerModality;
    minSize?: DrawerLength;
    defaultSize?: DrawerLength;
    maxSize?: DrawerLength;
    autoContentSize?: number;
}
/**
 * Resolves the three detents to px along the drawer's growth axis. The result is always
 * monotonic (`peek <= half <= full`) so drag, keyboard and controlled detents agree.
 */
export declare function resolveDetentSizes({ available, referenceEl, axis, modality, minSize, defaultSize, maxSize, autoContentSize, }: ResolveDetentSizesOptions): Record<DrawerDetent, number>;
export declare function Drawer({ open, onOpenChange, children, modality, side, detent: controlledDetent, defaultDetent, minSize, defaultSize, maxSize, minHeight, defaultHeight, maxHeight, onSnapChange, connectToBottomNav, draggable, swipeToDismiss, handleLabel, closeLabel, confirmDismissal, showCloseOnTouch, className, "aria-label": ariaLabel, "aria-labelledby": ariaLabelledBy, }: DrawerProps): import("react").ReactPortal | null;
