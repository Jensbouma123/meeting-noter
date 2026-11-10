import type { ReactNode } from "react";
export interface DropdownMenuProps {
    open?: boolean;
    defaultOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    children: ReactNode;
}
export declare function DropdownMenu({ open: controlledOpen, defaultOpen, onOpenChange, children, }: DropdownMenuProps): import("react").JSX.Element;
