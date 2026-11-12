import { useEffect, useRef, useState } from "react";
import { addMonths, addYears } from "@/lib/date-utils/index";
import type { CalendarViewMode } from "@/components/ui/DatePicker/index";

export function useDateRangeCalendar(startDate: Date | null) {
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  // Set by open and keyboard navigation so the effect below moves DOM focus; header clicks must not steal it.
  const moveFocusRef = useRef(false);

  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<CalendarViewMode>("day");
  const [viewDate, setViewDate] = useState<Date>(() => startDate ?? new Date());
  const [focusedDate, setFocusedDate] = useState<Date>(() => startDate ?? new Date());
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);

  useEffect(() => {
    if (startDate) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setViewDate(startDate);
      setFocusedDate(startDate);
    }
  }, [startDate]);

  useEffect(() => {
    if (!isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setViewMode("day");
      setHoveredDate(null);
      return;
    }
    // Reads the committed value once per open; later value changes must not move focus.
    const start = startDate ?? new Date();
    setViewDate(start);
    setFocusedDate(start);
    moveFocusRef.current = true;

    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || viewMode !== "day" || !moveFocusRef.current) return;
    moveFocusRef.current = false;
    gridRef.current?.querySelector<HTMLElement>('button[tabindex="0"]')?.focus({ preventScroll: true });
  }, [isOpen, viewMode, focusedDate, viewDate]);

  const handlePrevView = () => {
    if (viewMode === "day") setViewDate(addMonths(viewDate, -1));
    else if (viewMode === "month") setViewDate(addYears(viewDate, -1));
    else if (viewMode === "year") setViewDate(addYears(viewDate, -12));
    else if (viewMode === "decade") setViewDate(addYears(viewDate, -100));
  };

  const handleNextView = () => {
    if (viewMode === "day") setViewDate(addMonths(viewDate, 1));
    else if (viewMode === "month") setViewDate(addYears(viewDate, 1));
    else if (viewMode === "year") setViewDate(addYears(viewDate, 12));
    else if (viewMode === "decade") setViewDate(addYears(viewDate, 100));
  };

  const cycleViewMode = () => {
    if (viewMode === "day") setViewMode("month");
    else if (viewMode === "month") setViewMode("year");
    else if (viewMode === "year") setViewMode("decade");
    else setViewMode("day");
  };

  return {
    containerRef,
    triggerRef,
    gridRef,
    moveFocusRef,
    isOpen,
    setIsOpen,
    viewMode,
    setViewMode,
    viewDate,
    setViewDate,
    focusedDate,
    setFocusedDate,
    hoveredDate,
    setHoveredDate,
    handlePrevView,
    handleNextView,
    cycleViewMode,
  };
}
