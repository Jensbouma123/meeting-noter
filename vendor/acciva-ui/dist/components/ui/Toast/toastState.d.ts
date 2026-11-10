import type { ToastPosition, ToastRecord } from "./types.js";
export declare function generateToastId(): string;
export declare function isTopPosition(position: ToastPosition): boolean;
export declare function removeToast(prev: ToastRecord[], id: string, maxVisible: number): ToastRecord[];
