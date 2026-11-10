import type { ResponsiveSize, SizeTier } from "../../../lib/sizing-tokens/index.js";
export interface FormFieldContextValue {
    id: string;
    labelId: string;
    hintId: string;
    errorId: string;
    describedBy: string | undefined;
    error?: string;
    hint?: string;
    required: boolean;
    disabled: boolean;
    size: ResponsiveSize<SizeTier>;
}
export declare const FormFieldContext: import("react").Context<FormFieldContextValue | null>;
export declare function useFormField(): FormFieldContextValue;
