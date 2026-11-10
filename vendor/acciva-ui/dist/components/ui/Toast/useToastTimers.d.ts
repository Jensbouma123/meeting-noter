import { type Dispatch, type SetStateAction } from "react";
import type { ToastRecord } from "./types.js";
export declare function useToastTimers(toasts: ToastRecord[], setToasts: Dispatch<SetStateAction<ToastRecord[]>>, maxVisible: number): {
    requestDismiss: (id: string) => void;
    pauseToastTimer: (id: string) => void;
    resumeToastTimer: (id: string) => void;
    clearAllTimers: () => void;
};
