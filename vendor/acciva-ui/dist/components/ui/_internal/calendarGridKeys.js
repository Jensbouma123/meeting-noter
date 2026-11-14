import { addDays, addMonths, addYears, isSameMonth } from "../../../lib/date-utils/index.js";
/** Day grid: arrows, paging, Home/End move focus; Enter/Space select; Escape closes. */
export function handleCalendarDayKey(event, ctx) {
    const { focusedDate, viewDate, isDateDisabled, handleSelectDate, moveFocusRef, setFocusedDate, setViewDate, close } = ctx;
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
            if (!isDateDisabled(focusedDate))
                handleSelectDate(focusedDate);
            return;
        case "Escape":
            event.preventDefault();
            close();
            return;
        case "Tab":
            return;
    }
    if (handled) {
        event.preventDefault();
        // Disabled days cannot take focus: step past them along the arrow's own direction, else stay put.
        const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[event.key];
        for (let guard = 0; step && guard < 400 && isDateDisabled(nextDate); guard++)
            nextDate = addDays(nextDate, step);
        if (isDateDisabled(nextDate))
            return;
        moveFocusRef.current = true;
        ctx.onFocusMove?.(nextDate);
        setFocusedDate(nextDate);
        if (!isSameMonth(nextDate, viewDate))
            setViewDate(nextDate);
    }
}
/** Per view: arrow step sizes in the view's unit, and the view Escape steps up to. */
const VIEW_STEPS = {
    month: { unit: "month", small: 1, large: 3, escapeTo: "year" },
    year: { unit: "year", small: 1, large: 3, escapeTo: "decade" },
    decade: { unit: "year", small: 10, large: 30 },
};
/** Month, year and decade views: arrows move the window, Enter/Escape step the view mode. */
export function handleCalendarViewKey(event, viewMode, viewDate, setViewDate, setViewMode) {
    if (viewMode === "day")
        return;
    const { unit, small, large, escapeTo } = VIEW_STEPS[viewMode];
    if (event.key === "Escape") {
        // Also at the top level: the event must not reach the dialog and close it.
        event.preventDefault();
        event.stopPropagation();
        if (escapeTo)
            setViewMode(escapeTo);
        return;
    }
    const delta = { ArrowLeft: -small, ArrowRight: small, ArrowUp: -large, ArrowDown: large }[event.key];
    if (delta === undefined)
        return;
    event.preventDefault();
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    setViewDate(unit === "month" ? new Date(year, month + delta, 1) : new Date(year + delta, month, 1));
}
