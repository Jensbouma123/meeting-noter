import { addDays } from "@/lib/date-utils/index";
import type { DatePickerPreset } from "@/components/ui/DatePicker/types";

export const DEFAULT_PRESETS: readonly DatePickerPreset[] = [
  { label: "Today", value: new Date() },
  { label: "Tomorrow", value: addDays(new Date(), 1) },
  { label: "In 7 Days", value: addDays(new Date(), 7) },
  { label: "In 30 Days", value: addDays(new Date(), 30) },
];
