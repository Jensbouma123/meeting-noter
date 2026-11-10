import { addDays, addMonths, addYears, isSameMonth } from "../../../lib/date-utils/index.js";
export function handleDayGridKey(event, state, handleSelectDate) {
    const { startDate, endDate, focusedDate, viewDate, isDateDisabled, setFocusedDate, setViewDate, setHoveredDate, setIsOpen, triggerRef, moveFocusRef, } = state;
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
            triggerRef.current?.focus({ preventScroll: true });
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
        // While picking the end, the same keys move the previewed range end.
        if (startDate && !endDate)
            setHoveredDate(nextDate);
        setFocusedDate(nextDate);
        if (!isSameMonth(nextDate, viewDate)) {
            setViewDate(nextDate);
        }
    }
}
