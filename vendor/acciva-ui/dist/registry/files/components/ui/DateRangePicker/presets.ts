import { addDays, addMonths, endOfMonth, startOfDay, startOfMonth } from "@/lib/date-utils/index";
import type { DateRangePreset } from "@/components/ui/DateRangePicker/types";

export function getDefaultRangePresets(): readonly DateRangePreset[] {
  const today = startOfDay(new Date());
  const last7Start = addDays(today, -6);
  const last30Start = addDays(today, -29);
  const thisMonthStart = startOfMonth(today);
  const thisMonthEnd = endOfMonth(today);
  const lastMonthDate = addMonths(today, -1);
  const lastMonthStart = startOfMonth(lastMonthDate);
  const lastMonthEnd = endOfMonth(lastMonthDate);

  return [
    { label: "Today", value: [today, today] },
    { label: "Last 7 Days", value: [last7Start, today] },
    { label: "Last 30 Days", value: [last30Start, today] },
    { label: "This Month", value: [thisMonthStart, thisMonthEnd] },
    { label: "Last Month", value: [lastMonthStart, lastMonthEnd] },
  ];
}
