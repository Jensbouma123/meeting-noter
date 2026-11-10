import { type HTMLAttributes, type LabelHTMLAttributes, type ReactNode } from "react";
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
