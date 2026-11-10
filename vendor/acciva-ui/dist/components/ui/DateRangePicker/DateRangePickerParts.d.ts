import type { ReactNode } from "react";
import { type ResponsiveSize, type SizeTier } from "../../../lib/sizing-tokens/index.js";
import type { DateRangeUi } from "./types.js";
interface RangeTriggerProps {
    ui: DateRangeUi;
    setTriggerRef: (node: HTMLButtonElement | null) => void;
    inputId: string;
    labelId: string;
    dialogId: string;
    label?: string;
    name?: string;
    disabled: boolean;
    readOnly: boolean;
    error?: string;
    size: ResponsiveSize<SizeTier>;
    leadingIcon?: ReactNode;
    describedByIds?: string;
    displayString: string;
    showClear: boolean;
}
export declare function RangeTrigger({ ui, setTriggerRef, inputId, labelId, dialogId, label, name, disabled, readOnly, error, size, leadingIcon, describedByIds, displayString, showClear, }: RangeTriggerProps): import("react").JSX.Element;
export {};
