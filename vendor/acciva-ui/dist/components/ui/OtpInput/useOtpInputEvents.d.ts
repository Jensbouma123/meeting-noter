import type { ChangeEvent, ClipboardEvent, RefObject } from "react";
export declare function useOtpInputEvents(inputRef: RefObject<HTMLInputElement | null>, sanitize: (str: string) => string, updateValue: (next: string) => void, setCaretIndex: (index: number | null) => void, locked: boolean): {
    handleHiddenInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
    handlePaste: (e: ClipboardEvent<HTMLInputElement>) => void;
};
