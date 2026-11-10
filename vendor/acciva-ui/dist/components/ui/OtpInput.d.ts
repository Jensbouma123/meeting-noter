import { type HTMLAttributes } from "react";
import { type ResponsiveSize, type SizeTier } from "../../lib/sizing-tokens.js";
export type OtpInputType = "numeric" | "alphanumeric";
export interface OtpInputProps extends Omit<HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue"> {
    length?: number;
    value?: string;
    defaultValue?: string;
    onChange?: (value: string) => void;
    onComplete?: (value: string) => void;
    type?: OtpInputType;
    disabled?: boolean;
    readOnly?: boolean;
    autoFocus?: boolean;
    label?: string;
    hint?: string;
    error?: string;
    size?: ResponsiveSize<SizeTier>;
    mask?: boolean;
    "aria-describedby"?: string;
}
export declare const OtpInput: import("react").ForwardRefExoticComponent<OtpInputProps & import("react").RefAttributes<HTMLInputElement>>;
