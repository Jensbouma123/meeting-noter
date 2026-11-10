import type { ToastRecord } from "./types.js";
interface ToastCardProps {
    toast: ToastRecord;
    onDismiss: (id: string) => void;
    onPause: (id: string) => void;
    onResume: (id: string) => void;
}
export declare function ToastCard({ toast, onDismiss, onPause, onResume }: ToastCardProps): import("react").JSX.Element;
export {};
