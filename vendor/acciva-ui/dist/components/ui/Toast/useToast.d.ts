import type { ToastContextValue } from "./types.js";
export declare const ToastContext: import("react").Context<ToastContextValue | null>;
export declare function useToast(): ToastContextValue;
