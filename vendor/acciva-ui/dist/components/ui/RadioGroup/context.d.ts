import type { ResponsiveSize, SizeTier } from "../../../lib/sizing-tokens/index.js";
export interface RadioGroupContextValue {
    name: string;
    value: string | null;
    onChange: (value: string) => void;
    size: ResponsiveSize<SizeTier>;
    disabled: boolean;
    orientation: "vertical" | "horizontal";
}
export declare const RadioGroupContext: import("react").Context<RadioGroupContextValue | null>;
export declare function useRadioGroupContext(component: string): RadioGroupContextValue;
