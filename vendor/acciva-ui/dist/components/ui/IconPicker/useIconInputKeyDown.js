/** Search-input keys: Escape closes the grid, ArrowDown opens it or moves focus into the options. */
export function useIconInputKeyDown(open, setOpen, gridRef, rovingIndex) {
    return (event) => {
        if (event.key === "Escape") {
            if (open) {
                event.preventDefault();
                event.stopPropagation();
                setOpen(false);
            }
            return;
        }
        if (event.key === "ArrowDown") {
            event.preventDefault();
            if (!open) {
                setOpen(true);
            }
            else {
                const grid = gridRef.current;
                if (grid) {
                    const options = Array.from(grid.querySelectorAll('[role="option"]'));
                    const target = options[rovingIndex] ?? options[0];
                    target?.focus({ preventScroll: true });
                }
            }
            return;
        }
    };
}
