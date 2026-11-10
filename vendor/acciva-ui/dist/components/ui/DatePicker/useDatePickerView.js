import { useEffect, useMemo, useRef, useState } from "react";
import { addMonths, addYears, formatMonthYear, getCalendarGrid } from "../../../lib/date-utils/index.js";
export function useDatePickerView({ selectedDate, isOpen, setIsOpen, containerRef, gridRef }) {
    // Set by open and keyboard navigation so the effect below moves DOM focus; header clicks must not steal it.
    const moveFocusRef = useRef(false);
    const [viewMode, setViewMode] = useState("day");
    const [viewDate, setViewDate] = useState(() => selectedDate ?? new Date());
    const [focusedDate, setFocusedDate] = useState(() => selectedDate ?? new Date());
    useEffect(() => {
        if (selectedDate) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setViewDate(selectedDate);
            setFocusedDate(selectedDate);
        }
    }, [selectedDate]);
    useEffect(() => {
        if (!isOpen) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setViewMode("day");
            return;
        }
        // Reads the committed value once per open; later value changes must not move focus.
        const start = selectedDate ?? new Date();
        setViewDate(start);
        setFocusedDate(start);
        moveFocusRef.current = true;
        const onPointerDown = (event) => {
            if (!containerRef.current?.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", onPointerDown);
        return () => document.removeEventListener("mousedown", onPointerDown);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);
    useEffect(() => {
        if (!isOpen || viewMode !== "day" || !moveFocusRef.current)
            return;
        moveFocusRef.current = false;
        gridRef.current?.querySelector('button[tabindex="0"]')?.focus({ preventScroll: true });
    }, [isOpen, viewMode, focusedDate, viewDate, gridRef]);
    const handlePrevView = () => {
        if (viewMode === "day")
            setViewDate(addMonths(viewDate, -1));
        else if (viewMode === "month")
            setViewDate(addYears(viewDate, -1));
        else if (viewMode === "year")
            setViewDate(addYears(viewDate, -12));
        else if (viewMode === "decade")
            setViewDate(addYears(viewDate, -100));
    };
    const handleNextView = () => {
        if (viewMode === "day")
            setViewDate(addMonths(viewDate, 1));
        else if (viewMode === "month")
            setViewDate(addYears(viewDate, 1));
        else if (viewMode === "year")
            setViewDate(addYears(viewDate, 12));
        else if (viewMode === "decade")
            setViewDate(addYears(viewDate, 100));
    };
    const cycleViewMode = () => {
        if (viewMode === "day")
            setViewMode("month");
        else if (viewMode === "month")
            setViewMode("year");
        else if (viewMode === "year")
            setViewMode("decade");
        else
            setViewMode("day");
    };
    const currentYear = viewDate.getFullYear();
    const startYearDecade = Math.floor(currentYear / 10) * 10 - 1; // 12-year window (e.g. 2019-2030)
    const yearsWindow = Array.from({ length: 12 }, (_, i) => startYearDecade + i);
    const startCentury = Math.floor(currentYear / 100) * 100;
    const decadesWindow = Array.from({ length: 10 }, (_, i) => ({
        start: startCentury + i * 10,
        end: startCentury + i * 10 + 9,
    }));
    const calendarGrid = useMemo(() => getCalendarGrid(viewDate.getFullYear(), viewDate.getMonth()), [viewDate]);
    const viewHeaderLabel = useMemo(() => {
        if (viewMode === "day")
            return formatMonthYear(viewDate);
        if (viewMode === "month")
            return `${viewDate.getFullYear()}`;
        if (viewMode === "year")
            return `${startYearDecade + 1} – ${startYearDecade + 10}`;
        return `${startCentury} – ${startCentury + 99}`;
    }, [viewMode, viewDate, startYearDecade, startCentury]);
    return {
        viewMode,
        setViewMode,
        viewDate,
        setViewDate,
        focusedDate,
        setFocusedDate,
        moveFocusRef,
        handlePrevView,
        handleNextView,
        cycleViewMode,
        yearsWindow,
        decadesWindow,
        calendarGrid,
        viewHeaderLabel,
    };
}
