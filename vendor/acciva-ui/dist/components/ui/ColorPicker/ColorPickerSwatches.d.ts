import { type RGBA } from "../../../lib/color/formats/index.js";
import { type ResolvedSwatch } from "./colorPickerUtils.js";
interface SwatchGroupProps {
    caption: string;
    swatches: readonly ResolvedSwatch[];
    selectedHex: string;
    allowAlpha: boolean;
    onSelect: (rgba: RGBA) => void;
}
export declare function SwatchGroup({ caption, swatches, selectedHex, allowAlpha, onSelect }: SwatchGroupProps): import("react").JSX.Element | null;
export {};
