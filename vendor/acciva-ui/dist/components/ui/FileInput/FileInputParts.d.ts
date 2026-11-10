import type { FileInputMessages, FileRejection } from "./types.js";
export declare function FileInputLabel({ label, required, inputId, textClass, }: {
    label?: string;
    required?: boolean;
    inputId: string;
    textClass: string;
}): import("react").JSX.Element | null;
export declare function FileInputActions({ variant, isAvatar, files, disabled, m, clearAll, removeAt, }: {
    variant: "dropzone" | "compact" | "avatar";
    isAvatar: boolean;
    files: readonly File[];
    disabled: boolean;
    m: FileInputMessages;
    clearAll: () => void;
    removeAt: (index: number) => void;
}): import("react").JSX.Element;
export declare function FileInputStatus({ acceptId, acceptText, error, errorId, hint, hintId, rejectionsId, rejections, }: {
    acceptId?: string;
    acceptText: string;
    error?: string;
    errorId?: string;
    hint?: string;
    hintId?: string;
    rejectionsId?: string;
    rejections: FileRejection[];
}): import("react").JSX.Element;
