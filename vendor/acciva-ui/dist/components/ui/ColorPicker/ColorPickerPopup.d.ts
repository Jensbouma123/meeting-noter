import type { ReactNode, RefObject } from "react";
interface ColorPickerPopupProps {
    surface: "popover" | "drawer" | null;
    panel: ReactNode;
    triggerRef: RefObject<HTMLButtonElement | null>;
    onClose: () => void;
}
export declare function ColorPickerPopup({ surface, panel, triggerRef, onClose }: ColorPickerPopupProps): import("react").JSX.Element;
export {};
