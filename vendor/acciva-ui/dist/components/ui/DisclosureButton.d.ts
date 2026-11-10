import { type ButtonHTMLAttributes, type ReactNode } from "react";
import { type SizeTier } from "../../lib/sizing-tokens/index.js";
export interface DisclosureButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    size?: SizeTier;
    leadingIcon?: ReactNode;
    children?: ReactNode;
}
/**
 * Ghost text trigger with a trailing chevron, for opening a menu, popover or listbox. It owns no
 * open state: `aria-expanded` and `aria-haspopup` pass through from the caller (or a
 * `DropdownMenuTrigger`, which clones the child with them).
 */
export declare const DisclosureButton: import("react").ForwardRefExoticComponent<DisclosureButtonProps & import("react").RefAttributes<HTMLButtonElement>>;
