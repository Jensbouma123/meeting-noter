import { useCallback, useMemo, useState } from "react";
import { isAfterDay, isBeforeDay, isSameDay, normalizeDate } from "../../../lib/date-utils/index.js";
export function useDateRangeValue({ value, defaultValue, onChange, minDate, maxDate, disabledDates }) {
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
    const hasSelection = startDate !== null || endDate !== null;
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
    const rangeSummary = useMemo(() => {
        if (!startDate || !endDate)
            return null;
        const [lo, hi] = isBeforeDay(endDate, startDate) ? [endDate, startDate] : [startDate, endDate];
        const days = Math.round((hi.getTime() - lo.getTime()) / 86400000) + 1;
        return `${new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).formatRange(lo, hi)} · ${days} ${days === 1 ? "day" : "days"}`;
    }, [startDate, endDate]);
    const commitRange = useCallback((nextRange) => {
        if (!isControlled) {
            setUncontrolledRange(nextRange);
        }
        onChange?.(nextRange);
    }, [isControlled, onChange]);
    return { startDate, endDate, hasSelection, isDateDisabled, rangeSummary, commitRange };
}
