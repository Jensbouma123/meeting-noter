import { type ResponsiveSize, type SizeTier } from "../../../lib/sizing-tokens/index.js";
export declare function OtpInputBox({ char, isBoxFocused, isInvalid, mask, disabled, readOnly, size, onSelect, }: {
    char: string;
    isBoxFocused: boolean;
    isInvalid: boolean;
    mask: boolean;
    disabled: boolean;
    readOnly: boolean;
    size: ResponsiveSize<SizeTier>;
    onSelect: () => void;
}): import("react").JSX.Element;
export declare function OtpInputMessage({ error, hint, errorId, hintId, }: {
    error?: string;
    hint?: string;
    errorId?: string;
    hintId?: string;
}): import("react").JSX.Element;
