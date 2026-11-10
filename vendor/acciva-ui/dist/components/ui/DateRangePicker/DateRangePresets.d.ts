import type { DateRangePreset, DateRangeUi } from "./types.js";
interface DateRangePresetsProps {
    ui: DateRangeUi;
    presets: readonly DateRangePreset[];
}
export declare function DateRangePresets({ ui, presets }: DateRangePresetsProps): import("react").JSX.Element;
export {};
