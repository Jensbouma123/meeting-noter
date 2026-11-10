import { type HTMLAttributes, type LabelHTMLAttributes, type ReactNode } from "react";
import { type ResponsiveSize, type SizeTier } from "../../lib/sizing-tokens.js";
interface FormFieldContextValue {
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
export declare function useFormField(): FormFieldContextValue;
export interface FormFieldProps extends HTMLAttributes<HTMLDivElement> {
    id?: string;
    name?: string;
    label?: ReactNode;
    hint?: ReactNode;
    error?: string;
    required?: boolean;
    disabled?: boolean;
    size?: ResponsiveSize<SizeTier>;
    children: ReactNode;
}
export declare const FormField: import("react").ForwardRefExoticComponent<FormFieldProps & import("react").RefAttributes<HTMLDivElement>>;
export interface FormLabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
    children?: ReactNode;
}
export declare const FormLabel: import("react").ForwardRefExoticComponent<FormLabelProps & import("react").RefAttributes<HTMLLabelElement>>;
export interface FormDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {
    children?: ReactNode;
}
export declare const FormDescription: import("react").ForwardRefExoticComponent<FormDescriptionProps & import("react").RefAttributes<HTMLParagraphElement>>;
export interface FormMessageProps extends HTMLAttributes<HTMLParagraphElement> {
    children?: ReactNode;
}
export declare const FormMessage: import("react").ForwardRefExoticComponent<FormMessageProps & import("react").RefAttributes<HTMLParagraphElement>>;
export interface FormGroupProps extends HTMLAttributes<HTMLDivElement> {
    children: ReactNode;
}
export declare const FormGroup: import("react").ForwardRefExoticComponent<FormGroupProps & import("react").RefAttributes<HTMLDivElement>>;
export {};
