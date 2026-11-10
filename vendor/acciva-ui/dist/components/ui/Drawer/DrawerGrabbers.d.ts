import type { useDetentControl } from "./useDetentControl.js";
import type { useDragResize } from "./useDragResize.js";
import type { useSwipeDismiss } from "./useSwipeDismiss.js";
interface DrawerHandleProps {
    isVertical: boolean;
    isPersistent: boolean;
    dragEnabled: boolean;
    orientation: "horizontal" | "vertical";
    label: string;
    valueText: string;
    valueMin: number;
    valueMax: number;
    valueNow: number;
    drag: ReturnType<typeof useDragResize>;
    keyboard: ReturnType<typeof useDetentControl>;
}
/** The resize slider: drags between detents, and steps them with the arrow keys. */
export declare function DrawerHandle({ isVertical, isPersistent, dragEnabled, orientation, label, valueText, valueMin, valueMax, valueNow, drag, keyboard, }: DrawerHandleProps): import("react").JSX.Element;
interface DrawerSwipeGrabberProps {
    isVertical: boolean;
    isPersistent: boolean;
    label: string;
    onDismiss: () => void;
    swipe: ReturnType<typeof useSwipeDismiss>;
}
/** The standalone grabber for swipe-to-dismiss, used when no resize slider carries the flick. */
export declare function DrawerSwipeGrabber({ isVertical, isPersistent, label, onDismiss, swipe }: DrawerSwipeGrabberProps): import("react").JSX.Element;
export {};
