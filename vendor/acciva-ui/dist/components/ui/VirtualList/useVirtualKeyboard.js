import { useCallback } from "react";
import { rovingIndex } from "../_internal/rovingIndex.js";
export function useVirtualKeyboard({ items, isItemDisabled, onItemSelect, activeIndex, onActiveIndexChange, resolvedActiveIndex, setInternalActiveIndex, scrollToIndex, sizeAt, viewportHeight, }) {
    const count = items.length;
    const disabledAt = useCallback((index) => (isItemDisabled ? isItemDisabled(items[index], index) : false), [isItemDisabled, items]);
    const setActiveIndex = useCallback((index) => {
        if (activeIndex === undefined)
            setInternalActiveIndex(index);
        onActiveIndexChange?.(index);
        scrollToIndex(index);
    }, [activeIndex, onActiveIndexChange, scrollToIndex, setInternalActiveIndex]);
    const handleKeyDown = useCallback((event) => {
        if (count === 0)
            return;
        const page = Math.max(1, Math.floor(viewportHeight / Math.max(1, sizeAt(resolvedActiveIndex))) - 1);
        const next = rovingIndex({
            key: event.key,
            current: resolvedActiveIndex,
            count,
            orientation: "vertical",
            page,
            isDisabled: disabledAt,
        });
        if (next !== null) {
            event.preventDefault();
            setActiveIndex(next);
            return;
        }
        if ((event.key === "Enter" || event.key === " ") && onItemSelect) {
            event.preventDefault();
            if (!disabledAt(resolvedActiveIndex))
                onItemSelect(items[resolvedActiveIndex], resolvedActiveIndex);
        }
    }, [count, viewportHeight, sizeAt, resolvedActiveIndex, setActiveIndex, onItemSelect, disabledAt, items]);
    return { handleKeyDown, disabledAt };
}
