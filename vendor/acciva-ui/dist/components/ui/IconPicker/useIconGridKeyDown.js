import { rovingIndex } from "../_internal/rovingIndex.js";
// Row width from layout: options on the first row share its `offsetTop`, the first option on the next row starts a new one.
function columnCount(options) {
    if (options.length < 2)
        return 1;
    const firstTop = options[0].offsetTop;
    const nextRow = options.findIndex((option) => option.offsetTop > firstTop);
    return nextRow === -1 ? options.length : nextRow;
}
/** Grid roving focus via the shared `rovingIndex` core; Enter/Space commit the focused option; Escape closes. */
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
        if (event.key === "Enter" || event.key === " ") {
            if (filtered[current]) {
                event.preventDefault();
                commit(filtered[current].name);
            }
            return;
        }
        const next = rovingIndex({ key: event.key, current, count: options.length, orientation: "both", columns: columnCount(options) });
        if (next === null)
            return;
        event.preventDefault();
        setActiveIndex(next);
        options[next].focus();
    };
}
