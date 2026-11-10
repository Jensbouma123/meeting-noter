import { type HTMLAttributes, type ReactNode } from "react";
import { type ResponsiveSize, type SizeTier } from "../../../lib/sizing-tokens/index.js";
export interface RadioGroupProps extends Omit<HTMLAttributes<HTMLDivElement>, "onChange"> {
    value: string | null;
    onChange: (value: string) => void;
    name?: string;
    label?: string;
    hint?: string;
    error?: string;
    orientation?: "vertical" | "horizontal";
    size?: ResponsiveSize<SizeTier>;
    disabled?: boolean;
    required?: boolean;
    children: ReactNode;
    "aria-label"?: string;
    "aria-labelledby"?: string;
    "aria-describedby"?: string;
    /** First-keyboard-focus caption; `false` disables it. */
    arrowHint?: string | false;
}
export declare const RadioGroup: import("react").ForwardRefExoticComponent<RadioGroupProps & import("react").RefAttributes<HTMLDivElement>>;
