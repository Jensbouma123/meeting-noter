import { type ReactNode } from "react";
import { type SemanticVariant } from "../../components/ui/variant-tokens.js";
export type ToastVariant = SemanticVariant;
export type ToastPosition = "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right";
export interface ToastAction {
    label: string;
    onClick: () => void;
}
export interface ToastOptions {
    title?: ReactNode;
    description?: ReactNode;
    duration?: number;
    action?: ToastAction;
    dismissible?: boolean;
    position?: ToastPosition;
}
export interface ToastProviderProps {
    children: ReactNode;
    /** Default viewport region for a toast that doesn't specify its own `position`. */
    position?: ToastPosition;
    /** Toasts visible at once per position before further toasts queue. */
    maxVisible?: number;
    /** Key that moves focus into the toast region — see Modal-less keyboard reachability in the spec. */
    hotkey?: string;
}
type ToastFn = ((options: ToastOptions & {
    variant?: ToastVariant;
}) => string) & {
    success: (message: ReactNode, options?: ToastOptions) => string;
    danger: (message: ReactNode, options?: ToastOptions) => string;
    warning: (message: ReactNode, options?: ToastOptions) => string;
    info: (message: ReactNode, options?: ToastOptions) => string;
};
export interface ToastContextValue {
    toast: ToastFn;
    dismiss: (id: string) => void;
    dismissAll: () => void;
}
export declare function ToastProvider({ children, position, maxVisible, hotkey, }: ToastProviderProps): import("react").JSX.Element;
export declare function useToast(): ToastContextValue;
export {};
