import { type Dispatch, type SetStateAction } from "react";
import type { ToastContextValue, ToastPosition, ToastRecord } from "./types.js";
interface ToastApiOptions {
    position: ToastPosition;
    maxVisible: number;
    setToasts: Dispatch<SetStateAction<ToastRecord[]>>;
    requestDismiss: (id: string) => void;
    clearAllTimers: () => void;
}
export declare function useToastApi({ position, maxVisible, setToasts, requestDismiss, clearAllTimers, }: ToastApiOptions): ToastContextValue;
export {};
