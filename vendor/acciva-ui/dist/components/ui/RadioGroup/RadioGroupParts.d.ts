import { type ResponsiveSize, type SizeTier } from "../../../lib/sizing-tokens/index.js";
/** The decorative circle-and-dot indicator. Hidden from assistive tech; the button carries the name. */
export declare function RadioCircle({ size, isChecked, isDisabled, }: {
    size: ResponsiveSize<SizeTier>;
    isChecked: boolean;
    isDisabled: boolean;
}): import("react").JSX.Element;
