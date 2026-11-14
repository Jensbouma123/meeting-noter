import type { PasswordStrength } from "./types.js";
/** Always mounted so screen readers catch the text when it appears; collapsed while inactive. */
export declare function CapsLockNotice({ active }: {
    active: boolean;
}): import("react").JSX.Element;
export declare function StrengthMeter({ score, label }: Pick<PasswordStrength, "score" | "label">): import("react").JSX.Element;
