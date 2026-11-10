import { DETENT_LABEL } from "./sideTables.js";
/** What the handle announces and how the panel is sized, derived from the live drag/detent state. */
export function drawerReadout(dragSize, restSize, detentSizes, detent, docked, isVertical, draggable, sizeResolved, connectToBottomNav, bottomNavHeight) {
    const isDragging = dragSize !== null;
    const renderedSize = Math.round(dragSize ?? restSize);
    const reportedSize = Math.round(Math.min(Math.max(renderedSize, detentSizes.peek), detentSizes.full));
    const percent = detentSizes.full > 0 ? Math.round((renderedSize / detentSizes.full) * 100) : 0;
    const valueText = `${DETENT_LABEL[detent]}, ${percent}% expanded`;
    const handleOrientation = docked || !isVertical ? "horizontal" : "vertical";
    const defaultHandleLabel = handleOrientation === "vertical" ? "Drawer height" : "Drawer width";
    const insetBottom = connectToBottomNav ? bottomNavHeight : 0;
    const barVisible = connectToBottomNav && bottomNavHeight > 0;
    const sizeStyle = sizeResolved
        ? isVertical
            ? draggable
                ? { height: `${renderedSize}px` }
                : { maxHeight: `${Math.round(detentSizes.full)}px` }
            : draggable
                ? { width: `${renderedSize}px` }
                : { width: `${Math.round(detentSizes.full)}px` }
        : undefined;
    return {
        isDragging,
        renderedSize,
        reportedSize,
        valueText,
        handleOrientation,
        defaultHandleLabel,
        insetBottom,
        barVisible,
        sizeStyle,
    };
}
