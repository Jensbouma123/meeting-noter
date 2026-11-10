import { type FocusEvent, type KeyboardEvent } from "react";
/** Test hook: forget which hints were already shown. */
export declare function resetArrowHints(): void;
/**
 * First-keyboard-focus arrow-key hint (SC 3.3.2). Spread `groupProps` on the
 * composite's root, render `<ArrowHint>` inside it, and merge `describedBy(...)`
 * into its aria-describedby. `hint === false` disables it.
 */
export declare function useArrowHint(kind: string, hint: string | false | undefined, fallback: string): {
    groupProps: {
        onFocusCapture: () => void;
        onBlurCapture: (event: FocusEvent<HTMLElement>) => void;
        onKeyDownCapture: (event: KeyboardEvent<HTMLElement>) => void;
    };
    visible: boolean;
    id: string;
    text: string | null;
    describedBy: (existing?: string) => string | undefined;
};
