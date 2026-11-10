import { type RefObject } from "react";
import type { DrawerProps, DrawerSide } from "./types.js";
export interface DrawerElementRefs {
    wrapperRef: RefObject<HTMLDivElement | null>;
    sheetRef: RefObject<HTMLDialogElement | null>;
    contentRef: RefObject<HTMLDivElement | null>;
    innerContentRef: RefObject<HTMLDivElement | null>;
}
/** Owns every state machine, measurement and gesture hook behind `<Drawer>`. */
export declare function useDrawerModel(props: DrawerProps, elements: DrawerElementRefs): {
    mounted: boolean;
    entered: boolean;
    settled: boolean;
    sizeResolved: boolean;
    dragSize: number | null;
    detent: import("./types.js").DrawerDetent;
    detentControl: readonly [import("./types.js").DrawerDetent, number[], number, number, (next: import("./types.js").DrawerDetent) => void, (event: import("react").KeyboardEvent<HTMLButtonElement>) => void, () => void];
    restSize: number;
    docked: boolean;
    dragEnabled: boolean;
    showSwipeGrabber: boolean;
    drag: readonly [(event: import("react").PointerEvent<HTMLButtonElement>) => void, (event: import("react").PointerEvent<HTMLButtonElement>) => void, (event: import("react").PointerEvent<HTMLButtonElement>) => void, (event: import("react").PointerEvent<HTMLButtonElement>) => void];
    swipe: readonly [(event: import("react").PointerEvent<HTMLButtonElement>) => void, (event: import("react").PointerEvent<HTMLButtonElement>) => void, (event: import("react").PointerEvent<HTMLButtonElement>) => void, (event: import("react").PointerEvent<HTMLButtonElement>) => void];
    confirmingDiscard: boolean;
    setConfirmingDiscard: import("react").Dispatch<import("react").SetStateAction<boolean>>;
    requestClose: () => void;
    detentSizes: Record<import("./types.js").DrawerDetent, number>;
    bottomNavHeight: number;
    resolvedSide: DrawerSide;
    isPersistent: boolean;
    isVertical: boolean;
};
