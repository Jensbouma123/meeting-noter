import { type ColorFormat, type HSVA } from "../../../lib/color/formats/index.js";
import type { ColorPickerProps } from "./types.js";
interface ColorPickerValueOptions {
    value: string | undefined;
    defaultValue: string;
    onChange: ColorPickerProps["onChange"];
    format: ColorFormat;
    allowAlpha: boolean;
}
export declare function useColorPickerValue({ value, defaultValue, onChange, format, allowAlpha }: ColorPickerValueOptions): {
    hsva: HSVA;
    serialized: string;
    displayRgba: import("../../../lib/color/formats/index.js").RGBA;
    commit: (next: HSVA) => void;
};
export {};
