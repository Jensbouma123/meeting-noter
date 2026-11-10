import { type ReactNode } from "react";
/** Dirty-form guard: while `isDirty`, every dismissal asks before calling `onClose`. */
export interface DismissConfirmation {
    title: ReactNode;
    message?: ReactNode;
    discardLabel?: string;
    keepLabel?: string;
    isDirty: boolean;
}
export interface ModalProps {
    open: boolean;
    onClose: () => void;
    title: ReactNode;
    description?: ReactNode;
    children?: ReactNode;
    footer?: ReactNode;
    size?: "sm" | "md" | "lg";
    confirmDismissal?: DismissConfirmation;
    role?: "dialog" | "alertdialog";
    className?: string;
    "aria-label"?: string;
}
export declare function Modal({ open, onClose, title, description, children, footer, size, confirmDismissal, role, className, "aria-label": ariaLabel, }: ModalProps): import("react").ReactPortal | null;
