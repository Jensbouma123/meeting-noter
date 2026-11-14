import { isSameMonth } from "@/lib/date-utils/index";

const MS_PER_DAY = 86_400_000;

/**
 * The one day-grid tab stop, shared by DatePicker and DateRangePicker.
 * Anchor: the focused day when the viewed month holds it, else the 1st of the viewed month.
 * Returns the enabled grid day nearest the anchor (earlier day wins a tie), or null when none is enabled.
 */
export function resolveDayTabStop(
  focusedDate: Date,
  viewDate: Date,
  cells: readonly { date: Date }[],
  isDisabled: (date: Date) => boolean,
): Date | null {
  const anchor = isSameMonth(focusedDate, viewDate)
    ? focusedDate
    : new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);

  let nearest: Date | null = null;
  let nearestDistance = Infinity;
  for (const { date } of cells) {
    if (isDisabled(date)) continue;
    const distance = Math.abs(Math.round((date.getTime() - anchor.getTime()) / MS_PER_DAY));
    if (distance < nearestDistance) {
      nearest = date;
      nearestDistance = distance;
    }
  }
  return nearest;
}
