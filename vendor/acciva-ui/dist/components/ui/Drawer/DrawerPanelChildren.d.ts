import type { ReactNode, RefObject } from "react";
import { drawerReadout } from "./drawerReadout.js";
import type { useDrawerModel } from "./useDrawerModel.js";
interface DrawerPanelChildrenProps {
    model: ReturnType<typeof useDrawerModel>;
    readout: ReturnType<typeof drawerReadout>;
    draggable: boolean;
    safeAreaPadding: boolean;
    handleLabel: string | undefined;
    contentRef: RefObject<HTMLDivElement | null>;
    innerContentRef: RefObject<HTMLDivElement | null>;
    children: ReactNode;
}
/** The panel's affordance and content nodes, in the order the resolved side requires. */
export declare function DrawerPanelChildren({ model, readout, draggable, safeAreaPadding, handleLabel, contentRef, innerContentRef, children, }: DrawerPanelChildrenProps): import("react").JSX.Element;
export {};
