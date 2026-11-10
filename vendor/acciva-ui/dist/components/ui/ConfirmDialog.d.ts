import { type ReactNode } from "react";
export type ConfirmDialogVariant = "danger" | "primary" | "warning";
export interface ConfirmDialogProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void | Promise<void>;
    title: string;
    description?: ReactNode;
    confirmText?: string;
    cancelText?: string;
    variant?: ConfirmDialogVariant;
    loading?: boolean;
    children?: ReactNode;
}
export declare function ConfirmDialog({ open, onClose, onConfirm, title, description, confirmText, cancelText, variant, loading, children, }: ConfirmDialogProps): import("react").JSX.Element;
