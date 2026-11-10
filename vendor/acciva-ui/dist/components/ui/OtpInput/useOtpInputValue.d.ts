import type { OtpInputType } from "./OtpInputTypes.js";
export declare function useOtpInputValue(length: number, type: OtpInputType, value: string | undefined, defaultValue: string | undefined, onChange: ((value: string) => void) | undefined, onComplete: ((value: string) => void) | undefined): {
    currentValue: string;
    sanitize: (str: string) => string;
    updateValue: (next: string) => void;
};
