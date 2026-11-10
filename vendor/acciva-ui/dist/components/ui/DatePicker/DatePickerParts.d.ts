import { type ResponsiveSize, type SizeTier } from "../../../lib/sizing-tokens/index.js";
interface DatePickerLabelProps {
    id: string;
    htmlFor: string;
    label?: string;
    required?: boolean;
    size: ResponsiveSize<SizeTier>;
}
export declare function DatePickerLabel({ id, htmlFor, label, required, size }: DatePickerLabelProps): import("react").JSX.Element | null;
interface DatePickerMessagesProps {
    hint?: string;
    hintId?: string;
    error?: string;
    errorId?: string;
}
export declare function DatePickerMessages({ hint, hintId, error, errorId }: DatePickerMessagesProps): import("react").JSX.Element;
export {};
