import { type RefObject } from "react";
export declare function useOtpInputCaret(inputRef: RefObject<HTMLInputElement | null>, currentValue: string, length: number, locked: boolean): {
    isFocused: boolean;
    activeIndex: number;
    setCaretIndex: import("react").Dispatch<import("react").SetStateAction<number | null>>;
    handleFocus: () => void;
    handleBlur: () => void;
    handleKeyDown: () => void;
    handleClick: () => void;
    handleBoxClick: (index: number) => void;
};
