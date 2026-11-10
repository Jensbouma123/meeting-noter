import { type HTMLAttributes, type ReactNode } from "react";
import { type ResponsiveSize, type SizeTier } from "../../lib/sizing-tokens.js";
export interface RadioGroupContextValue {
    name: string;
    value: string | null;
    onChange: (value: string) => void;
    size: ResponsiveSize<SizeTier>;
    disabled: boolean;
    orientation: "vertical" | "horizontal";
}
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
}
export declare const RadioGroup: import("react").ForwardRefExoticComponent<RadioGroupProps & import("react").RefAttributes<HTMLDivElement>>;
export type RadioVariant = "default" | "card";
export interface RadioProps extends Omit<HTMLAttributes<HTMLButtonElement>, "onChange"> {
    value: string;
    label?: ReactNode;
    description?: ReactNode;
    disabled?: boolean;
    /**
     * `"card"` swaps the bare circle-and-label row for a full-width bordered tile.
     * That changes the DOM shape and the hit area, which is a variant, not a flag.
     */
    variant?: RadioVariant;
    /**
     * @deprecated Use `variant="card"`. Kept working so no caller breaks; it loses
     * to `variant` when both are set and will be removed in a future major.
     */
    card?: boolean;
    id?: string;
}
export declare const Radio: import("react").ForwardRefExoticComponent<RadioProps & import("react").RefAttributes<HTMLButtonElement>>;
