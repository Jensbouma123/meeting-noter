import { formatMonthYear } from "@/lib/date-utils/index";
import type { CalendarViewMode } from "@/components/ui/DatePicker/index";

export function getViewWindows(viewDate: Date) {
  const currentYear = viewDate.getFullYear();
  const startYearDecade = Math.floor(currentYear / 10) * 10 - 1;
  const yearsWindow = Array.from({ length: 12 }, (_, i) => startYearDecade + i);

  const startCentury = Math.floor(currentYear / 100) * 100;
  const decadesWindow = Array.from({ length: 10 }, (_, i) => ({
    start: startCentury + i * 10,
    end: startCentury + i * 10 + 9,
  }));

  return { startYearDecade, yearsWindow, startCentury, decadesWindow };
}

export function getViewHeaderLabel(viewMode: CalendarViewMode, viewDate: Date): string {
  const { startYearDecade, startCentury } = getViewWindows(viewDate);
  if (viewMode === "day") return formatMonthYear(viewDate);
  if (viewMode === "month") return `${viewDate.getFullYear()}`;
  if (viewMode === "year") return `${startYearDecade + 1} – ${startYearDecade + 10}`;
  return `${startCentury} – ${startCentury + 99}`;
}
