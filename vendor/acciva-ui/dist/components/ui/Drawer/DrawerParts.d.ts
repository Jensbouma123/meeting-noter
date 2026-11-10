import type { ReactNode, RefObject } from "react";
import { type DismissConfirmation } from "../Modal/index.js";
interface DrawerContentProps {
    contentRef: RefObject<HTMLDivElement | null>;
    innerContentRef: RefObject<HTMLDivElement | null>;
    isVertical: boolean;
    barVisible: boolean;
    safeAreaPadding: boolean;
    children: ReactNode;
}
/** The scrolling body. `barVisible` says a connected BottomNav is on screen and owns the bottom inset; `safeAreaPadding={false}` drops it for a host that pads itself. */
export declare function DrawerContent({ contentRef, innerContentRef, isVertical, barVisible, safeAreaPadding, children }: DrawerContentProps): import("react").JSX.Element;
interface DrawerPersistentChromeProps {
    closeLabel: string;
    showCloseOnTouch: boolean;
    onClose: () => void;
    /** Announced politely when a persistent drawer is also draggable; omitted otherwise. */
    liveText?: string;
}
/** A persistent drawer's close control, pinned to the panel's inline-end corner, and its live readout. */
export declare function DrawerPersistentChrome({ closeLabel, showCloseOnTouch, onClose, liveText }: DrawerPersistentChromeProps): import("react").JSX.Element;
interface DrawerDiscardPromptProps {
    dismissal: DismissConfirmation | undefined;
    open: boolean;
    onKeep: () => void;
    onDiscard: () => void;
}
/** Confirms a dismissal that would throw away unsaved edits. Renders nothing without `dismissal`. */
export declare function DrawerDiscardPrompt({ dismissal, open, onKeep, onDiscard }: DrawerDiscardPromptProps): import("react").JSX.Element | null;
export {};
