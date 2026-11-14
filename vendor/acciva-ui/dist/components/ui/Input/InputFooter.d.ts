interface InputFooterProps {
    hint?: string;
    error?: string;
    hintId?: string;
    errorId?: string;
    showCharCount: boolean;
    charCountId?: string;
    count: number;
    maxLength?: number;
}
export declare function InputFooter({ hint, error, showCharCount, charCountId, ...rest }: InputFooterProps): import("react").JSX.Element | null;
export {};
