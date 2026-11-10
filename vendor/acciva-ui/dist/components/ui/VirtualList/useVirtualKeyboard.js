import { useCallback } from "react";
export function useVirtualKeyboard({ items, isItemDisabled, onItemSelect, activeIndex, onActiveIndexChange, resolvedActiveIndex, setInternalActiveIndex, scrollToIndex, sizeAt, viewportHeight, }) {
    const count = items.length;
    const disabledAt = useCallback((index) => (isItemDisabled ? isItemDisabled(items[index], index) : false), [isItemDisabled, items]);
    const findEnabled = useCallback((from, step) => {
        for (let i = from; i >= 0 && i < count; i += step) {
            if (!disabledAt(i))
                return i;
        }
        return -1;
    }, [count, disabledAt]);
    const setActiveIndex = useCallback((index) => {
        if (activeIndex === undefined)
            setInternalActiveIndex(index);
        onActiveIndexChange?.(index);
        scrollToIndex(index);
    }, [activeIndex, onActiveIndexChange, scrollToIndex, setInternalActiveIndex]);
    const moveActive = useCallback((delta) => {
        if (count === 0)
            return;
        const target = Math.max(0, Math.min(resolvedActiveIndex + delta, count - 1));
        const forward = findEnabled(target, delta > 0 ? 1 : -1);
        const next = forward === -1 ? findEnabled(target, delta > 0 ? -1 : 1) : forward;
        if (next !== -1)
            setActiveIndex(next);
    }, [count, resolvedActiveIndex, findEnabled, setActiveIndex]);
    const handleKeyDown = useCallback((event) => {
        if (count === 0)
            return;
        const page = Math.max(1, Math.floor(viewportHeight / Math.max(1, sizeAt(resolvedActiveIndex))) - 1);
        switch (event.key) {
            case "ArrowDown":
                event.preventDefault();
                moveActive(1);
                break;
            case "ArrowUp":
                event.preventDefault();
                moveActive(-1);
                break;
            case "PageDown":
                event.preventDefault();
                moveActive(page);
                break;
            case "PageUp":
                event.preventDefault();
                moveActive(-page);
                break;
            case "Home": {
                event.preventDefault();
                const first = findEnabled(0, 1);
                if (first !== -1)
                    setActiveIndex(first);
                break;
            }
            case "End": {
                event.preventDefault();
                const last = findEnabled(count - 1, -1);
                if (last !== -1)
                    setActiveIndex(last);
                break;
            }
            case "Enter":
            case " ":
                if (!onItemSelect)
                    return;
                event.preventDefault();
                if (!disabledAt(resolvedActiveIndex))
                    onItemSelect(items[resolvedActiveIndex], resolvedActiveIndex);
                break;
            default:
        }
    }, [count, viewportHeight, sizeAt, resolvedActiveIndex, moveActive, findEnabled, setActiveIndex, onItemSelect, disabledAt, items]);
    return { handleKeyDown, disabledAt };
}
