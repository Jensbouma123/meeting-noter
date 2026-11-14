import { type Dispatch, type RefObject, type SetStateAction } from "react";
/** Closes the popup when a pointer goes down outside `containerRef` while it is open. */
export declare function useDismissOnPointerDown(open: boolean, containerRef: RefObject<HTMLDivElement | null>, setOpen: Dispatch<SetStateAction<boolean>>): void;
