import { type ReactElement, type ReactNode } from "react";
export interface PopoverProps {
    /** Main body content rendered inside the popover card. */
    content: ReactNode;
    /** Optional title displayed at the top of the popover card. */
    title?: ReactNode;
    /** Controlled open state. */
    open?: boolean;
    /** Initial open state when uncontrolled. Defaults to `false`. */
    defaultOpen?: boolean;
    /** Callback fired when the open state changes. */
    onOpenChange?: (open: boolean) => void;
    /** Callback fired when the popover requests to close (via close button, Escape, or outside click). */
    onClose?: () => void;
    /** Whether clicking outside the popover card and trigger dismisses it. Defaults to `false`. */
    dismissOnOutsideClick?: boolean;
    /** Optional label for an action button at the bottom of the popover. */
    actionLabel?: string;
    /** Callback fired when the action button is clicked. */
    onAction?: () => void;
    /** Preferred placement relative to the trigger. Defaults to `"top"`. Auto-flips on viewport collision. */
    placement?: "top" | "bottom" | "left" | "right";
    /** Optional alias for placement. */
    side?: "top" | "bottom" | "left" | "right";
    /** Trigger element anchored to the popover card. Receives click listener and accessibility attributes. */
    children?: ReactElement;
    /** Optional ref to an anchor element if not wrapping a child trigger. */
    anchorRef?: React.RefObject<HTMLElement | null>;
    /** Max width of the popover card in pixels or CSS value. Defaults to `320`. */
    maxWidth?: number | string;
    /** Additional CSS class names for the popover card container. */
    className?: string;
    /** Whether open and close transitions are animated. Defaults to `true`. */
    animated?: boolean;
}
export declare function Popover({ content, title, open: controlledOpen, defaultOpen, onOpenChange, onClose, dismissOnOutsideClick, actionLabel, onAction, placement, side, children, anchorRef, maxWidth, className, animated, }: PopoverProps): import("react").JSX.Element;
