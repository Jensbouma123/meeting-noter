import { useCallback } from "react";
export function useDataListKeyboard(props, nav) {
    const { interactive = true, layout = "list", selectionMode = "none", onItemClick, onReorder } = props;
    const { processedItems, activeColumns, activeIndex, setActiveIndex, handleToggleItemSelection, handleReorderMove, } = nav;
    return useCallback((event) => {
        if (!interactive || processedItems.length === 0)
            return;
        const count = processedItems.length;
        // Reorder keyboard path (SC 2.1.1): Alt+Arrow moves the active row itself.
        if (onReorder && event.altKey && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
            event.preventDefault();
            const delta = event.key === "ArrowUp" ? -1 : 1;
            const from = activeIndex;
            const to = from + delta;
            if (from >= 0 && from < count && to >= 0 && to < count) {
                handleReorderMove(from, to);
            }
            return;
        }
        let delta = 0;
        switch (event.key) {
            case "ArrowDown":
                delta = layout === "grid" ? activeColumns : 1;
                break;
            case "ArrowUp":
                delta = layout === "grid" ? -activeColumns : -1;
                break;
            case "ArrowRight":
                delta = 1;
                break;
            case "ArrowLeft":
                delta = -1;
                break;
            case "Home":
                event.preventDefault();
                setActiveIndex(0);
                return;
            case "End":
                event.preventDefault();
                setActiveIndex(count - 1);
                return;
            case "Enter":
            case " ":
                // Keys from a nested control (row-action button, checkbox) belong to it.
                if (event.target !== event.currentTarget)
                    return;
                if (activeIndex >= 0 && activeIndex < count) {
                    event.preventDefault();
                    const currentItem = processedItems[activeIndex];
                    if (selectionMode !== "none") {
                        handleToggleItemSelection(currentItem, activeIndex);
                    }
                    onItemClick?.(currentItem, activeIndex);
                }
                return;
            default:
                return;
        }
        if (delta !== 0) {
            event.preventDefault();
            setActiveIndex((prev) => Math.max(0, Math.min(count - 1, prev + delta)));
        }
    }, [
        interactive,
        processedItems,
        layout,
        activeColumns,
        activeIndex,
        setActiveIndex,
        selectionMode,
        handleToggleItemSelection,
        onItemClick,
        onReorder,
        handleReorderMove,
    ]);
}
