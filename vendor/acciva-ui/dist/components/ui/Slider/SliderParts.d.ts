import { type ResponsiveSize, type SizeTier } from "../../../lib/sizing-tokens/index.js";
interface SliderLabelProps {
    id: string;
    label: string;
    readout: string | number;
    size: ResponsiveSize<SizeTier>;
}
export declare function SliderLabel({ id, label, readout, size }: SliderLabelProps): import("react").JSX.Element;
export {};
