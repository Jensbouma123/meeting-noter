import { type HTMLAttributes } from "react";
import { type RGBA } from "../../lib/color/formats.js";
import { type SwatchSize } from "./Swatch.js";
export interface SwatchOption {
    value: string;
    label?: string;
}
export interface SwatchDetails {
    hex: string;
    rgba: RGBA;
    label: string;
}
export interface SwatchPickerProps extends Omit<HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange"> {
    options: readonly (string | SwatchOption)[];
    value?: string | null;
    defaultValue?: string | null;
    onChange?: (value: string, details: SwatchDetails) => void;
    label?: string;
    hint?: string;
    error?: string;
    required?: boolean;
    disabled?: boolean;
    name?: string;
    orientation?: "horizontal" | "vertical";
    size?: SwatchSize;
}
export declare const SwatchPicker: import("react").ForwardRefExoticComponent<SwatchPickerProps & import("react").RefAttributes<HTMLDivElement>>;
