import { useCallback, useMemo, useState } from "react";
import { isAfterDay, isBeforeDay, isSameDay, normalizeDate, startOfDay } from "../../../lib/date-utils/index.js";
export function useDatePickerSelection(options, onPicked) {
    const { value, defaultValue, onChange, minDate, maxDate, disabledDates, disabled, readOnly, clearable, closeOnSelect } = options;
    const [uncontrolledDate, setUncontrolledDate] = useState(() => normalizeDate(defaultValue));
    const isControlled = value !== undefined;
    const selectedDate = isControlled ? normalizeDate(value) : uncontrolledDate;
    const parsedMinDate = useMemo(() => normalizeDate(minDate), [minDate]);
    const parsedMaxDate = useMemo(() => normalizeDate(maxDate), [maxDate]);
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
    const handleSelectDate = useCallback((targetDate) => {
        if (disabled || readOnly || isDateDisabled(targetDate))
            return;
        const normalized = startOfDay(targetDate);
        if (!isControlled) {
            setUncontrolledDate(normalized);
        }
        onChange?.(normalized);
        if (closeOnSelect)
            onPicked();
    }, [disabled, readOnly, isDateDisabled, isControlled, onChange, closeOnSelect, onPicked]);
    const handleClear = useCallback((event) => {
        event?.stopPropagation();
        if (disabled || readOnly)
            return;
        if (!isControlled) {
            setUncontrolledDate(null);
        }
        onChange?.(null);
    }, [disabled, readOnly, isControlled, onChange]);
    const showClear = clearable && !disabled && !readOnly && selectedDate !== null;
    return { selectedDate, isDateDisabled, handleSelectDate, handleClear, showClear };
}
