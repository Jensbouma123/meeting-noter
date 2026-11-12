import { isSameDay } from "@/lib/date-utils/index";
import { cn } from "@/lib/utils";
import type { DateRangePreset, DateRangeUi } from "@/components/ui/DateRangePicker/types";

interface DateRangePresetsProps {
  ui: DateRangeUi;
  presets: readonly DateRangePreset[];
}

export function DateRangePresets({ ui, presets }: DateRangePresetsProps) {
  const { startDate, endDate, handlePresetSelect } = ui;

  return (
    <div className="mb-3 flex gap-1 overflow-x-auto border-b border-border/80 pb-2">
      {presets.map((preset) => {
        const isPresetActive =
          startDate &&
          endDate &&
          preset.value[0] &&
          preset.value[1] &&
          isSameDay(startDate, preset.value[0]) &&
          isSameDay(endDate, preset.value[1]);

        return (
          <button
            key={preset.label}
            type="button"
            onClick={() => handlePresetSelect(preset)}
            className={cn(
              "focus-ring shrink-0 whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium transition-colors",
              isPresetActive
                ? "bg-primary-600 text-button-primary-foreground dark:bg-primary-500 font-semibold shadow-xs"
                : "bg-elevation-2 text-muted-foreground hover:bg-elevation-3 hover:text-foreground dark:hover:bg-elevation-4",
            )}
          >
            {preset.label}
          </button>
        );
      })}
    </div>
  );
}
