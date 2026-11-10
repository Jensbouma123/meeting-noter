import { type InputHTMLAttributes } from "react";
export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
    label?: string;
    indeterminate?: boolean;
    /** Merged onto the label text span. `className` styles the root `<label>`. */
    labelClassName?: string;
}
export declare const Checkbox: import("react").ForwardRefExoticComponent<CheckboxProps & import("react").RefAttributes<HTMLInputElement>>;
