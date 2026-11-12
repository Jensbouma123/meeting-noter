import { getDaysInMonth } from "@/lib/date-utils/arithmetic";
import { isSameDay } from "@/lib/date-utils/compare";

export interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isPrevMonth: boolean;
  isNextMonth: boolean;
}

export function getCalendarGrid(year: number, month: number): CalendarDay[] {
  const today = new Date();
  const firstDayOfMonth = new Date(year, month, 1);
  const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday
  const daysInMonth = getDaysInMonth(year, month);
  const daysInPrevMonth = getDaysInMonth(year, month - 1);

  const grid: CalendarDay[] = [];

  // Previous month trailing days
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const date = new Date(year, month - 1, day);
    grid.push({
      date,
      isCurrentMonth: false,
      isToday: isSameDay(date, today),
      isPrevMonth: true,
      isNextMonth: false,
    });
  }

  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    grid.push({
      date,
      isCurrentMonth: true,
      isToday: isSameDay(date, today),
      isPrevMonth: false,
      isNextMonth: false,
    });
  }

  // Next month leading days to complete full 6 weeks (42 days) or full grid
  const remainingCells = 42 - grid.length;
  for (let day = 1; day <= remainingCells; day++) {
    const date = new Date(year, month + 1, day);
    grid.push({
      date,
      isCurrentMonth: false,
      isToday: isSameDay(date, today),
      isPrevMonth: false,
      isNextMonth: true,
    });
  }

  return grid;
}
