import { type HTMLAttributes, type ReactNode } from "react";
import type { ResponsiveSize, SizeTier } from "../../../lib/sizing-tokens/index.js";
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
