import type { DateRangeGridHint, DateRangePreset, DateRangeUi } from "./types.js";
interface DateRangeDialogProps {
    ui: DateRangeUi;
    dialogId: string;
    gridHint: DateRangeGridHint;
    presets: readonly DateRangePreset[];
    showPresets: boolean;
    clearable: boolean;
}
export declare function DateRangeDialog({ ui, dialogId, gridHint, presets, showPresets, clearable }: DateRangeDialogProps): import("react").JSX.Element;
export {};
