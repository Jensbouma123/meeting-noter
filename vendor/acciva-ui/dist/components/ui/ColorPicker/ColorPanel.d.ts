import { type ColorFormat, type HSVA } from "../../../lib/color/formats/index.js";
import type { ColorSwatch } from "./types.js";
interface ColorPanelProps {
    hsva: HSVA;
    format: ColorFormat;
    allowAlpha: boolean;
    swatches: readonly (string | ColorSwatch)[] | undefined;
    showEyeDropper: boolean;
    onChange: (hsva: HSVA) => void;
}
export declare function ColorPanel({ hsva, format, allowAlpha, swatches, showEyeDropper, onChange }: ColorPanelProps): import("react").JSX.Element;
export {};
