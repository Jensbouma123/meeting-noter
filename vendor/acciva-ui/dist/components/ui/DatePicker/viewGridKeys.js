/** Month, year and decade views: arrows move the window, Enter/Escape step the view mode. */
export function handleViewGridKey(event, viewMode, viewDate, setViewDate, setViewMode) {
    if (viewMode === "month") {
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
}
