import { type RefObject } from "react";
export declare function usePopoverFocus(open: boolean, triggerRef: RefObject<HTMLElement | null>, popoverRef: RefObject<HTMLDivElement | null>, handleClose: () => void): (e: React.KeyboardEvent<HTMLDivElement>) => void;
