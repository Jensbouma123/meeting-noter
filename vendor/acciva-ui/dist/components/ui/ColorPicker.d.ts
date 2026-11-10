import { type ButtonHTMLAttributes } from "react";
import { type ColorFormat, type HSLA, type RGBA } from "../../lib/color/formats.js";
import { type ResponsiveSize, type SizeTier } from "../../lib/sizing-tokens.js";
export type { ColorFormat } from "../../lib/color/formats.js";
export interface ColorSwatch {
    value: string;
    label?: string;
}
export interface ColorDetails {
    hex: string;
    rgba: RGBA;
    hsla: HSLA;
}
export interface ColorPickerProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "value" | "defaultValue" | "onChange" | "type" | "children"> {
    value?: string;
    defaultValue?: string;
    onChange?: (value: string, details: ColorDetails) => void;
    format?: ColorFormat;
    allowAlpha?: boolean;
    swatches?: readonly (string | ColorSwatch)[];
    showEyeDropper?: boolean;
    label?: string;
    hint?: string;
    error?: string;
    required?: boolean;
    readOnly?: boolean;
    name?: string;
    size?: ResponsiveSize<SizeTier>;
}
export declare const ColorPicker: import("react").ForwardRefExoticComponent<ColorPickerProps & import("react").RefAttributes<HTMLButtonElement>>;
