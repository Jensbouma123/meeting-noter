"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef, useCallback, useEffect, useId, useMemo, useRef, useState, } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react";
import { CONTROL_HEIGHT, CONTROL_RADIUS, ICON_SCALE_CLASS, INPUT_ICON_INSET, INPUT_ICON_INSET_TRAILING, INPUT_ICON_PADDING_LEADING, INPUT_ICON_PADDING_TRAILING, INPUT_PADDING_X, TEXT_SIZE, TOUCH_TARGET_CLASS, needsTouchTarget, resolveResponsive, touchTargetClass, } from "../../lib/sizing-tokens.js";
import { cn } from "../../lib/utils.js";
import { Grid } from "./Grid.js";
import { HStack } from "./HStack.js";
import { VStack } from "./VStack.js";
import { addDays, addMonths, addYears, endOfMonth, formatAriaDate, formatDefaultDate, formatMonthYear, getCalendarGrid, isAfterDay, isBeforeDay, isDateInRange, isSameDay, isSameMonth, MONTH_NAMES_SHORT, normalizeDate, startOfDay, startOfMonth, } from "../../lib/date-utils.js";
function getDefaultRangePresets() {
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
export const DateRangePicker = forwardRef(function DateRangePicker({ value, defaultValue, onChange, placeholder = "Select date range…", label, hint, error, required, disabled = false, readOnly = false, clearable = false, minDate, maxDate, disabledDates, presets, showPresets = false, formatDate = formatDefaultDate, size = "md", className, id, name, closeOnSelect = false, leadingIcon, "aria-describedby": describedBy, }, forwardedRef) {
    const generatedId = useId();
    const inputId = id !== null && id !== void 0 ? id : generatedId;
    const dialogId = `${inputId}-dialog`;
    const labelId = `${inputId}-label`;
    const hintId = hint && !error ? `${inputId}-hint` : undefined;
    const errorId = error ? `${inputId}-error` : undefined;
    const describedByIds = [describedBy, hintId, errorId].filter(Boolean).join(" ") || undefined;
    const containerRef = useRef(null);
    const triggerRef = useRef(null);
    const gridRef = useRef(null);
    const [isOpen, setIsOpen] = useState(false);
    const [uncontrolledRange, setUncontrolledRange] = useState(() => {
        if (defaultValue) {
            return [normalizeDate(defaultValue[0]), normalizeDate(defaultValue[1])];
        }
        return [null, null];
    });
    const isControlled = value !== undefined;
    const selectedRange = useMemo(() => {
        if (isControlled) {
            if (!value)
                return [null, null];
            return [normalizeDate(value[0]), normalizeDate(value[1])];
        }
        return uncontrolledRange;
    }, [isControlled, value, uncontrolledRange]);
    const [startDate, endDate] = selectedRange;
    const parsedMinDate = useMemo(() => normalizeDate(minDate), [minDate]);
    const parsedMaxDate = useMemo(() => normalizeDate(maxDate), [maxDate]);
    const [viewMode, setViewMode] = useState("day");
    const [viewDate, setViewDate] = useState(() => startDate !== null && startDate !== void 0 ? startDate : new Date());
    const [focusedDate, setFocusedDate] = useState(() => startDate !== null && startDate !== void 0 ? startDate : new Date());
    const [hoveredDate, setHoveredDate] = useState(null);
    const resolvedPresets = useMemo(() => presets !== null && presets !== void 0 ? presets : getDefaultRangePresets(), [presets]);
    const isDateDisabled = useCallback((targetDate) => {
        if (parsedMinDate && isBeforeDay(targetDate, parsedMinDate))
            return true;
        if (parsedMaxDate && isAfterDay(targetDate, parsedMaxDate))
            return true;
        if (disabledDates) {
            if (typeof disabledDates === "function")
                return disabledDates(targetDate);
            return disabledDates.some((d) => isSameDay(d, targetDate));
        }
        return false;
    }, [parsedMinDate, parsedMaxDate, disabledDates]);
    useEffect(() => {
        if (startDate) {
            setViewDate(startDate);
            setFocusedDate(startDate);
        }
    }, [startDate]);
    useEffect(() => {
        if (!isOpen) {
            setViewMode("day");
            setHoveredDate(null);
            return;
        }
        const onPointerDown = (event) => {
            var _a;
            if (!((_a = containerRef.current) === null || _a === void 0 ? void 0 : _a.contains(event.target))) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", onPointerDown);
        return () => document.removeEventListener("mousedown", onPointerDown);
    }, [isOpen]);
    const handleSelectDate = useCallback((targetDate) => {
        var _a;
        if (disabled || readOnly || isDateDisabled(targetDate))
            return;
        const normalized = startOfDay(targetDate);
        let nextRange;
        if (!startDate || (startDate && endDate)) {
            // First click in new range
            nextRange = [normalized, null];
        }
        else {
            // Second click
            if (isBeforeDay(normalized, startDate)) {
                nextRange = [normalized, startDate];
            }
            else {
                nextRange = [startDate, normalized];
            }
        }
        if (!isControlled) {
            setUncontrolledRange(nextRange);
        }
        onChange === null || onChange === void 0 ? void 0 : onChange(nextRange);
        if (nextRange[0] && nextRange[1] && closeOnSelect) {
            setIsOpen(false);
            (_a = triggerRef.current) === null || _a === void 0 ? void 0 : _a.focus({ preventScroll: true });
        }
    }, [disabled, readOnly, isDateDisabled, startDate, endDate, isControlled, onChange, closeOnSelect]);
    const handleClear = useCallback((event) => {
        event === null || event === void 0 ? void 0 : event.stopPropagation();
        if (disabled || readOnly)
            return;
        const emptyRange = [null, null];
        if (!isControlled) {
            setUncontrolledRange(emptyRange);
        }
        onChange === null || onChange === void 0 ? void 0 : onChange(emptyRange);
    }, [disabled, readOnly, isControlled, onChange]);
    const handleTriggerKeyDown = (event) => {
        if (disabled || readOnly)
            return;
        if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setIsOpen(true);
        }
        else if (event.key === "Escape" && isOpen) {
            event.preventDefault();
            setIsOpen(false);
        }
        else if (event.key === "Tab" && isOpen) {
            // Allow standard Tab navigation through calendar popover
        }
    };
    const handleGridKeyDown = (event) => {
        var _a;
        if (!isOpen)
            return;
        if (viewMode === "day") {
            let nextDate = new Date(focusedDate);
            let handled = false;
            switch (event.key) {
                case "ArrowLeft":
                    nextDate = addDays(focusedDate, -1);
                    handled = true;
                    break;
                case "ArrowRight":
                    nextDate = addDays(focusedDate, 1);
                    handled = true;
                    break;
                case "ArrowUp":
                    nextDate = addDays(focusedDate, -7);
                    handled = true;
                    break;
                case "ArrowDown":
                    nextDate = addDays(focusedDate, 7);
                    handled = true;
                    break;
                case "PageUp":
                    nextDate = event.shiftKey ? addYears(focusedDate, -1) : addMonths(focusedDate, -1);
                    handled = true;
                    break;
                case "PageDown":
                    nextDate = event.shiftKey ? addYears(focusedDate, 1) : addMonths(focusedDate, 1);
                    handled = true;
                    break;
                case "Home":
                    nextDate = addDays(focusedDate, -focusedDate.getDay());
                    handled = true;
                    break;
                case "End":
                    nextDate = addDays(focusedDate, 6 - focusedDate.getDay());
                    handled = true;
                    break;
                case "Enter":
                case " ":
                    event.preventDefault();
                    if (!isDateDisabled(focusedDate)) {
                        handleSelectDate(focusedDate);
                    }
                    return;
                case "Escape":
                    event.preventDefault();
                    setIsOpen(false);
                    (_a = triggerRef.current) === null || _a === void 0 ? void 0 : _a.focus({ preventScroll: true });
                    return;
                case "Tab":
                    return;
            }
            if (handled) {
                event.preventDefault();
                setFocusedDate(nextDate);
                if (!isSameMonth(nextDate, viewDate)) {
                    setViewDate(nextDate);
                }
            }
        }
        else if (viewMode === "month") {
            let handled = false;
            const currentMonth = viewDate.getMonth();
            const currentYear = viewDate.getFullYear();
            switch (event.key) {
                case "ArrowLeft":
                    setViewDate(new Date(currentYear, currentMonth - 1, 1));
                    handled = true;
                    break;
                case "ArrowRight":
                    setViewDate(new Date(currentYear, currentMonth + 1, 1));
                    handled = true;
                    break;
                case "ArrowUp":
                    setViewDate(new Date(currentYear, currentMonth - 3, 1));
                    handled = true;
                    break;
                case "ArrowDown":
                    setViewDate(new Date(currentYear, currentMonth + 3, 1));
                    handled = true;
                    break;
                case "Enter":
                case " ":
                    event.preventDefault();
                    setViewMode("day");
                    return;
                case "Escape":
                    event.preventDefault();
                    setViewMode("day");
                    return;
            }
            if (handled)
                event.preventDefault();
        }
        else if (viewMode === "year") {
            let handled = false;
            const currentYear = viewDate.getFullYear();
            switch (event.key) {
                case "ArrowLeft":
                    setViewDate(new Date(currentYear - 1, viewDate.getMonth(), 1));
                    handled = true;
                    break;
                case "ArrowRight":
                    setViewDate(new Date(currentYear + 1, viewDate.getMonth(), 1));
                    handled = true;
                    break;
                case "ArrowUp":
                    setViewDate(new Date(currentYear - 3, viewDate.getMonth(), 1));
                    handled = true;
                    break;
                case "ArrowDown":
                    setViewDate(new Date(currentYear + 3, viewDate.getMonth(), 1));
                    handled = true;
                    break;
                case "Enter":
                case " ":
                    event.preventDefault();
                    setViewMode("month");
                    return;
                case "Escape":
                    event.preventDefault();
                    setViewMode("month");
                    return;
            }
            if (handled)
                event.preventDefault();
        }
        else if (viewMode === "decade") {
            let handled = false;
            const currentYear = viewDate.getFullYear();
            switch (event.key) {
                case "ArrowLeft":
                    setViewDate(new Date(currentYear - 10, viewDate.getMonth(), 1));
                    handled = true;
                    break;
                case "ArrowRight":
                    setViewDate(new Date(currentYear + 10, viewDate.getMonth(), 1));
                    handled = true;
                    break;
                case "ArrowUp":
                    setViewDate(new Date(currentYear - 30, viewDate.getMonth(), 1));
                    handled = true;
                    break;
                case "ArrowDown":
                    setViewDate(new Date(currentYear + 30, viewDate.getMonth(), 1));
                    handled = true;
                    break;
                case "Enter":
                case " ":
                    event.preventDefault();
                    setViewMode("year");
                    return;
                case "Escape":
                    event.preventDefault();
                    setViewMode("year");
                    return;
            }
            if (handled)
                event.preventDefault();
        }
    };
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
    const startYearDecade = Math.floor(currentYear / 10) * 10 - 1;
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
    const displayString = useMemo(() => {
        if (startDate && endDate) {
            return `${formatDate(startDate)} – ${formatDate(endDate)}`;
        }
        if (startDate) {
            return `${formatDate(startDate)} – …`;
        }
        return placeholder;
    }, [startDate, endDate, formatDate, placeholder]);
    const hasSelection = startDate !== null || endDate !== null;
    const showClear = clearable && !disabled && !readOnly && hasSelection;
    return (_jsxs(VStack, { spacing: "sm", className: cn("w-full", className), children: [label ? (_jsxs("label", { id: labelId, htmlFor: inputId, className: cn("font-medium text-foreground", resolveResponsive(size, TEXT_SIZE)), children: [label, required ? _jsx("span", { className: "ml-0.5 text-danger", children: "*" }) : null] })) : null, _jsxs("div", { ref: containerRef, className: "relative", children: [_jsxs("button", { ref: (node) => {
                            triggerRef.current = node;
                            if (typeof forwardedRef === "function")
                                forwardedRef(node);
                            else if (forwardedRef)
                                forwardedRef.current = node;
                        }, id: inputId, type: "button", role: "combobox", name: name, disabled: disabled, "aria-expanded": isOpen, "aria-haspopup": "dialog", "aria-controls": dialogId, "aria-labelledby": label ? `${labelId} ${inputId}` : undefined, "aria-describedby": describedByIds, "aria-invalid": error ? true : undefined, onClick: () => {
                            if (!disabled && !readOnly)
                                setIsOpen((prev) => !prev);
                        }, onKeyDown: handleTriggerKeyDown, className: cn("focus-ring relative flex w-full items-center text-left border bg-background text-foreground transition-colors motion-feedback", disabled && "cursor-not-allowed opacity-60 bg-elevation-2", readOnly && "cursor-default bg-elevation-1", error ? "border-danger focus-visible:ring-danger" : "border-border hover:border-muted-foreground/60", resolveResponsive(size, CONTROL_HEIGHT), resolveResponsive(size, CONTROL_RADIUS), resolveResponsive(size, TEXT_SIZE), leadingIcon ? resolveResponsive(size, INPUT_ICON_PADDING_LEADING) : resolveResponsive(size, INPUT_ICON_PADDING_LEADING), showClear ? resolveResponsive(size, INPUT_ICON_PADDING_TRAILING) : resolveResponsive(size, INPUT_PADDING_X), typeof size === "string"
                            ? touchTargetClass(size)
                            : [size.base, size.sm, size.md, size.lg].some((tier) => tier !== undefined && needsTouchTarget(tier))
                                ? TOUCH_TARGET_CLASS
                                : undefined), children: [_jsx("span", { className: cn("pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted-foreground", resolveResponsive(size, INPUT_ICON_INSET), resolveResponsive(size, ICON_SCALE_CLASS)), children: leadingIcon !== null && leadingIcon !== void 0 ? leadingIcon : _jsx(CalendarIcon, { className: "shrink-0" }) }), _jsx("span", { className: cn("truncate", !hasSelection && "text-muted-foreground"), children: displayString })] }), showClear ? (_jsx("button", { type: "button", tabIndex: -1, "aria-label": "Clear date range", onClick: handleClear, className: cn("focus-ring absolute top-1/2 -translate-y-1/2 flex items-center justify-center rounded text-muted-foreground transition-colors hover:bg-elevation-2 hover:text-foreground active:scale-95 dark:hover:bg-elevation-3", resolveResponsive(size, INPUT_ICON_INSET_TRAILING), resolveResponsive(size, ICON_SCALE_CLASS)), children: _jsx(X, { className: "size-3.5" }) })) : null, isOpen ? (_jsxs("div", { id: dialogId, role: "dialog", tabIndex: -1, "aria-modal": "false", "aria-label": "Choose date range", className: "absolute left-0 z-50 mt-2 w-80 rounded-xl border border-border bg-surface p-3 shadow-xl animate-fade-in focus:outline-none", children: [showPresets && resolvedPresets.length > 0 ? (_jsx(HStack, { wrap: true, spacing: "xs", className: "mb-3 border-b border-border/80 pb-2", children: resolvedPresets.map((preset) => {
                                    const isPresetActive = startDate &&
                                        endDate &&
                                        preset.value[0] &&
                                        preset.value[1] &&
                                        isSameDay(startDate, preset.value[0]) &&
                                        isSameDay(endDate, preset.value[1]);
                                    return (_jsx("button", { type: "button", onClick: () => {
                                            const newRange = [preset.value[0], preset.value[1]];
                                            if (!isControlled)
                                                setUncontrolledRange(newRange);
                                            onChange === null || onChange === void 0 ? void 0 : onChange(newRange);
                                            if (closeOnSelect)
                                                setIsOpen(false);
                                        }, className: cn("focus-ring rounded-md px-3 py-1 text-xs font-medium transition-colors", isPresetActive
                                            ? "bg-primary-600 text-button-primary-foreground dark:bg-primary-500 font-semibold shadow-xs"
                                            : "bg-elevation-2 text-muted-foreground hover:bg-elevation-3 hover:text-foreground dark:hover:bg-elevation-4"), children: preset.label }, preset.label));
                                }) })) : null, _jsxs(HStack, { justify: "between", spacing: "xs", className: "pb-2", children: [_jsx("button", { type: "button", "aria-label": "Previous view", onClick: handlePrevView, className: "touch-target-44 focus-ring flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-elevation-2 hover:text-foreground dark:hover:bg-elevation-3", children: _jsx(ChevronLeft, { className: "size-4" }) }), _jsx("button", { type: "button", "aria-label": `Current view: ${viewHeaderLabel}. Click to change view mode`, onClick: cycleViewMode, className: "focus-ring rounded-md px-2 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-elevation-2 dark:hover:bg-elevation-3", children: viewHeaderLabel }), _jsx("button", { type: "button", "aria-label": "Next view", onClick: handleNextView, className: "touch-target-44 focus-ring flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-elevation-2 hover:text-foreground dark:hover:bg-elevation-3", children: _jsx(ChevronRight, { className: "size-4" }) })] }), _jsxs("div", { ref: gridRef, tabIndex: 0, onKeyDown: handleGridKeyDown, className: "focus:outline-none", children: [viewMode === "day" ? (_jsxs("div", { children: [_jsx(Grid, { role: "row", columns: 7, spacing: "none", className: "text-center", children: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((dayName, idx) => (_jsx("span", { role: "columnheader", "aria-label": ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][idx], className: cn("py-1 font-semibold text-muted-foreground", TEXT_SIZE.xxs), children: dayName }, dayName))) }), _jsx(Grid, { role: "grid", "aria-label": formatMonthYear(viewDate), columns: 7, spacing: "none", className: "gap-y-1", children: calendarGrid.map((day) => {
                                                    const isStart = startDate ? isSameDay(startDate, day.date) : false;
                                                    const isEnd = endDate ? isSameDay(endDate, day.date) : false;
                                                    const isSelected = isStart || isEnd;
                                                    const isInEffectiveRange = startDate && endDate
                                                        ? isDateInRange(day.date, startDate, endDate)
                                                        : startDate && hoveredDate
                                                            ? isDateInRange(day.date, startDate, hoveredDate)
                                                            : false;
                                                    const isRowStart = day.date.getDay() === 0;
                                                    const isRowEnd = day.date.getDay() === 6;
                                                    const isFocused = isSameDay(focusedDate, day.date);
                                                    const isDayDisabled = isDateDisabled(day.date);
                                                    return (_jsx("div", { role: "gridcell", "aria-selected": isSelected, className: cn("relative flex size-8 items-center justify-center p-0", isInEffectiveRange && "bg-primary-500/15 dark:bg-primary-400/20", (isStart || isRowStart) && "rounded-l-full", (isEnd || isRowEnd) && "rounded-r-full", isSelected && !endDate && "rounded-full"), children: _jsx("button", { type: "button", tabIndex: isFocused ? 0 : -1, disabled: isDayDisabled, "aria-disabled": isDayDisabled, "aria-label": formatAriaDate(day.date), onClick: () => handleSelectDate(day.date), onMouseEnter: () => {
                                                                if (startDate && !endDate)
                                                                    setHoveredDate(day.date);
                                                            }, className: cn("touch-target-44 focus-ring relative z-10 flex size-8 items-center justify-center rounded-full text-xs font-medium transition-colors", 
                                                            // A day outside the viewed month is still an enabled, selectable
                                                            // range endpoint — only `isDayDisabled` withdraws it — so it is
                                                            // meaningful text under SC 1.4.3, not a disabled control.
                                                            day.isCurrentMonth ? "text-foreground" : "text-subtle-foreground", isSelected
                                                                ? "bg-primary-600 font-semibold text-button-primary-foreground shadow-xs hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-400"
                                                                : isInEffectiveRange
                                                                    ? "text-primary-900 font-semibold dark:text-primary-100 hover:bg-primary-500/25 dark:hover:bg-primary-400/30"
                                                                    : "hover:bg-elevation-2 dark:hover:bg-elevation-3", day.isToday && !isSelected && "border border-primary-500 font-semibold text-primary-600 dark:text-primary-400", isDayDisabled && "cursor-not-allowed opacity-60 line-through hover:bg-transparent dark:hover:bg-transparent"), children: day.date.getDate() }) }, day.date.toISOString()));
                                                }) })] })) : null, viewMode === "month" ? (_jsx(Grid, { role: "grid", "aria-label": `Select month for ${viewDate.getFullYear()}`, columns: 3, spacing: "sm", className: "pt-1", children: MONTH_NAMES_SHORT.map((mShort, mIndex) => {
                                            const isCurrentM = viewDate.getMonth() === mIndex;
                                            const isSelectedM = (startDate && startDate.getFullYear() === viewDate.getFullYear() && startDate.getMonth() === mIndex) ||
                                                (endDate && endDate.getFullYear() === viewDate.getFullYear() && endDate.getMonth() === mIndex);
                                            return (_jsx("button", { type: "button", onClick: () => {
                                                    setViewDate(new Date(viewDate.getFullYear(), mIndex, 1));
                                                    setViewMode("day");
                                                }, className: cn("focus-ring rounded-lg py-3 text-xs font-medium transition-colors", isSelectedM
                                                    ? "bg-primary-600 font-semibold text-button-primary-foreground shadow-xs hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-400"
                                                    : isCurrentM
                                                        ? "border border-primary-500 font-semibold text-primary-600 dark:text-primary-400 hover:bg-elevation-2 dark:hover:bg-elevation-3"
                                                        : "text-foreground hover:bg-elevation-2 dark:hover:bg-elevation-3"), children: mShort }, mShort));
                                        }) })) : null, viewMode === "year" ? (_jsx(Grid, { role: "grid", "aria-label": "Select year", columns: 3, spacing: "sm", className: "pt-1", children: yearsWindow.map((yearNum) => {
                                            const isSelectedY = (startDate && startDate.getFullYear() === yearNum) ||
                                                (endDate && endDate.getFullYear() === yearNum);
                                            const isCurrentY = new Date().getFullYear() === yearNum;
                                            return (_jsx("button", { type: "button", onClick: () => {
                                                    setViewDate(new Date(yearNum, viewDate.getMonth(), 1));
                                                    setViewMode("month");
                                                }, className: cn("focus-ring rounded-lg py-3 text-xs font-medium transition-colors", isSelectedY
                                                    ? "bg-primary-600 font-semibold text-button-primary-foreground shadow-xs hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-400"
                                                    : isCurrentY
                                                        ? "border border-primary-500 font-semibold text-primary-600 dark:text-primary-400 hover:bg-elevation-2 dark:hover:bg-elevation-3"
                                                        : "text-foreground hover:bg-elevation-2 dark:hover:bg-elevation-3"), children: yearNum }, yearNum));
                                        }) })) : null, viewMode === "decade" ? (_jsx(Grid, { role: "grid", "aria-label": "Select decade", columns: 2, spacing: "sm", className: "pt-1", children: decadesWindow.map((decade) => {
                                            const isSelectedDecade = (startDate && startDate.getFullYear() >= decade.start && startDate.getFullYear() <= decade.end) ||
                                                (endDate && endDate.getFullYear() >= decade.start && endDate.getFullYear() <= decade.end);
                                            return (_jsxs("button", { type: "button", onClick: () => {
                                                    setViewDate(new Date(decade.start, viewDate.getMonth(), 1));
                                                    setViewMode("year");
                                                }, className: cn("focus-ring rounded-lg px-2 py-3 text-xs font-medium transition-colors", isSelectedDecade
                                                    ? "bg-primary-600 font-semibold text-button-primary-foreground shadow-xs hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-400"
                                                    : "text-foreground hover:bg-elevation-2 dark:hover:bg-elevation-3"), children: [decade.start, " \u2013 ", decade.end] }, decade.start));
                                        }) })) : null] }), _jsxs(HStack, { justify: "between", spacing: "none", className: "mt-3 border-t border-border/80 pt-2", children: [_jsx("span", { className: "text-xs text-muted-foreground", children: startDate && !endDate ? "Select end date" : startDate && endDate ? "Range selected" : "Select start date" }), clearable ? (_jsx("button", { type: "button", onClick: () => {
                                            handleClear();
                                            if (closeOnSelect)
                                                setIsOpen(false);
                                        }, className: "focus-ring rounded px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-elevation-2 hover:text-foreground dark:hover:bg-elevation-3", children: "Clear" })) : null] })] })) : null] }), hint && !error ? (_jsx("p", { id: hintId, className: "text-xs text-muted-foreground", children: hint })) : null, error ? (_jsx("p", { id: errorId, role: "alert", className: "text-xs font-medium text-danger animate-fade-in", children: error })) : null] }));
});
