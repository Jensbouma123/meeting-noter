import { type HSVA } from "../../../lib/color/formats/index.js";
interface SpectrumProps {
    hsva: HSVA;
    onChange: (hsva: HSVA) => void;
}
export declare function Spectrum({ hsva, onChange }: SpectrumProps): import("react").JSX.Element;
export {};
