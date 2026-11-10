import { type ButtonHTMLAttributes, type HTMLAttributes, type KeyboardEvent, type ReactElement, type ReactNode } from "react";
export interface DropdownMenuProps {
    open?: boolean;
    defaultOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    children: ReactNode;
}
export declare function DropdownMenu({ open: controlledOpen, defaultOpen, onOpenChange, children, }: DropdownMenuProps): import("react").JSX.Element;
export interface DropdownMenuTriggerProps {
    children: ReactElement<{
        ref?: React.Ref<HTMLElement>;
        onClick?: (e: React.MouseEvent) => void;
        onKeyDown?: (e: KeyboardEvent) => void;
    }>;
}
export declare function DropdownMenuTrigger({ children }: DropdownMenuTriggerProps): import("react").JSX.Element;
export interface DropdownMenuContentProps extends HTMLAttributes<HTMLDivElement> {
    align?: "start" | "center" | "end";
    sideOffset?: number;
    className?: string;
    children?: ReactNode;
}
export declare const DropdownMenuContent: import("react").ForwardRefExoticComponent<DropdownMenuContentProps & import("react").RefAttributes<HTMLDivElement>>;
export type DropdownMenuItemVariant = "default" | "danger";
export interface DropdownMenuItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    /** `"danger"` is the same destructive tone `Button`, `Badge` and `Alert` use. */
    variant?: DropdownMenuItemVariant;
    /**
     * @deprecated Use `variant="danger"`. Kept working so no caller breaks; it
     * loses to `variant` when both are set and will be removed in a future major.
     */
    destructive?: boolean;
    icon?: ReactNode;
    children: ReactNode;
}
export declare const DropdownMenuItem: import("react").ForwardRefExoticComponent<DropdownMenuItemProps & import("react").RefAttributes<HTMLButtonElement>>;
export interface DropdownMenuCheckboxItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    children: ReactNode;
}
export declare const DropdownMenuCheckboxItem: import("react").ForwardRefExoticComponent<DropdownMenuCheckboxItemProps & import("react").RefAttributes<HTMLButtonElement>>;
export declare const DropdownMenuSeparator: import("react").ForwardRefExoticComponent<HTMLAttributes<HTMLDivElement> & import("react").RefAttributes<HTMLDivElement>>;
export declare const DropdownMenuLabel: import("react").ForwardRefExoticComponent<HTMLAttributes<HTMLDivElement> & import("react").RefAttributes<HTMLDivElement>>;
export declare function DropdownMenuShortcut({ className, children, ...props }: HTMLAttributes<HTMLElement>): import("react").JSX.Element;
export declare const DropdownMenuGroup: import("react").ForwardRefExoticComponent<HTMLAttributes<HTMLDivElement> & import("react").RefAttributes<HTMLDivElement>>;
