import { type RefObject } from "react";
export declare function usePopoverOpen(controlledOpen: boolean | undefined, defaultOpen: boolean, onOpenChange: ((open: boolean) => void) | undefined, onClose: (() => void) | undefined, animated: boolean, popoverRef: RefObject<HTMLDivElement | null>): readonly [boolean, boolean, () => void, (nextOpen: boolean) => void];
