// Row width from layout: options on the first row share its `offsetTop`, the first option on the next row starts a new one.
function columnCount(options) {
    if (options.length < 2)
        return 1;
    const firstTop = options[0].offsetTop;
    const nextRow = options.findIndex((option) => option.offsetTop > firstTop);
    return nextRow === -1 ? options.length : nextRow;
}
/** Arrow/Home/End roving focus across the listbox; Enter/Space commit the focused option; Escape closes. */
export function useIconGridKeyDown(gridRef, filtered, setActiveIndex, commit, closeAndFocusTrigger) {
    return (event) => {
        if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            closeAndFocusTrigger();
            return;
        }
        const grid = gridRef.current;
        if (!grid)
            return;
        const options = Array.from(grid.querySelectorAll('[role="option"]'));
        if (options.length === 0)
            return;
        const current = options.findIndex((option) => option === document.activeElement);
        if (current === -1)
            return;
        const columns = columnCount(options);
        const last = options.length - 1;
        let next = null;
        switch (event.key) {
            case "ArrowRight":
                next = Math.min(current + 1, last);
                break;
            case "ArrowLeft":
                next = Math.max(current - 1, 0);
                break;
            case "ArrowDown":
                next = Math.min(current + columns, last);
                break;
            case "ArrowUp":
                next = Math.max(current - columns, 0);
                break;
            case "Home":
                next = 0;
                break;
            case "End":
                next = last;
                break;
            case "Enter":
            case " ":
                if (filtered[current]) {
                    event.preventDefault();
                    commit(filtered[current].name);
                }
                return;
            default:
                return;
        }
        event.preventDefault();
        setActiveIndex(next);
        options[next].focus();
    };
}
