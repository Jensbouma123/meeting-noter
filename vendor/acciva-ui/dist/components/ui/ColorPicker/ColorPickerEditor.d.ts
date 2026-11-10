import { type ColorFormat, type HSLA, type HSVA, type RGBA } from "../../../lib/color/formats/index.js";
interface ColorPickerEditorProps {
    editorFormat: ColorFormat;
    onEditorFormatChange: (format: ColorFormat) => void;
    hsva: HSVA;
    rgba: RGBA;
    hsla: HSLA;
    allowAlpha: boolean;
    commitRgba: (next: RGBA) => void;
    commitHsla: (next: HSLA) => void;
    onChange: (hsva: HSVA) => void;
}
export declare function ColorPickerEditor({ editorFormat, onEditorFormatChange, hsva, rgba, hsla, allowAlpha, commitRgba, commitHsla, onChange, }: ColorPickerEditorProps): import("react").JSX.Element;
export {};
