/** Popover-wide Escape: closes from any control inside the panel (chips included), not only the grid. */
export function useIconPopoverKeyDown(closeAndFocusTrigger) {
    return (event) => {
        if (event.key !== "Escape")
            return;
        event.preventDefault();
        event.stopPropagation();
        closeAndFocusTrigger();
    };
}
