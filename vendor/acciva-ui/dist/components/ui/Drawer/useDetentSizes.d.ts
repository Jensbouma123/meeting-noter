import { type RefObject } from "react";
import type { DrawerAxis, DrawerDetent, DrawerLength, DrawerModality } from "./types.js";
/** Measures the panel's detent sizes in px, re-measuring on resize and on content growth. */
export declare function useDetentSizes(open: boolean, modality: DrawerModality, axis: DrawerAxis, isVertical: boolean, minSize: DrawerLength | undefined, defaultSize: DrawerLength | undefined, maxSize: DrawerLength | undefined, wrapperRef: RefObject<HTMLDivElement | null>, sheetRef: RefObject<HTMLDialogElement | null>, contentRef: RefObject<HTMLDivElement | null>, innerContentRef: RefObject<HTMLDivElement | null>, setSizeResolved: (resolved: boolean) => void): Record<DrawerDetent, number>;
