import type { Ref } from "react";
import { type SwatchSize } from "../Swatch.js";
import type { ResolvedOption } from "./types.js";
interface SwatchOptionButtonProps {
    option: ResolvedOption;
    selected: boolean;
    tabbable: boolean;
    disabled: boolean;
    size: SwatchSize;
    buttonRef: Ref<HTMLButtonElement>;
    onSelect: () => void;
    onFocus: () => void;
}
export declare function SwatchOptionButton({ option, selected, tabbable, disabled, size, buttonRef, onSelect, onFocus, }: SwatchOptionButtonProps): import("react").JSX.Element;
export {};
