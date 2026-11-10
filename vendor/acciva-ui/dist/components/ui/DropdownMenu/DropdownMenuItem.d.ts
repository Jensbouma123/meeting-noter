import { type ButtonHTMLAttributes, type ReactNode } from "react";
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
