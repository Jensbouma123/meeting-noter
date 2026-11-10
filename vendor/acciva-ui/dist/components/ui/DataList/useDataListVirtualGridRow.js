import { jsx as _jsx } from "react/jsx-runtime";
import { useCallback } from "react";
import { cn } from "../../../lib/utils.js";
import { defaultKeyExtractor } from "./utils.js";
export function useDataListVirtualGridRow(props, nav) {
    const { gap = 16, getItemKey = defaultKeyExtractor, isItemDisabled, selectionMode = "none", itemClassName, onItemClick, } = props;
    const { activeColumns, processedItems, selectedKeySet, activeIndex, getItemIdResolved, resolvedItemRole, renderRow, renderRowChrome, handleToggleItemSelection, } = nav;
    const renderVirtualGridRow = useCallback((rowItems, rowState) => {
        return (
        // Raw grid: the template and gap are computed from `activeColumns` and the
        // `gap` prop at runtime, which `Grid`'s fixed tiers cannot express.
        _jsx("div", { className: "grid w-full h-full", style: {
                gridTemplateColumns: `repeat(${activeColumns}, minmax(0, 1fr))`,
                gap: typeof gap === "number" ? `${gap}px` : gap,
            }, children: rowItems.map((item, colIdx) => {
                const itemIndex = rowState.index * activeColumns + colIdx;
                const key = getItemKey(item, itemIndex);
                const isSelected = selectedKeySet.has(key);
                const disabled = isItemDisabled ? isItemDisabled(item, itemIndex) : false;
                const active = itemIndex === activeIndex;
                return (_jsx("div", { id: getItemIdResolved(itemIndex), "data-index": itemIndex, role: resolvedItemRole, "aria-selected": selectionMode !== "none" ? isSelected : undefined, "aria-disabled": disabled || undefined, "aria-setsize": processedItems.length, "aria-posinset": itemIndex + 1, 
                    // Raw flex: `itemClassName` is consumer-supplied and lands in the same
                    // class string, so a `Stack`'s own alignment classes could collide with it.
                    className: cn("relative h-full flex flex-col", itemClassName, (selectionMode !== "none" || onItemClick) && !disabled && "cursor-pointer"), onClick: () => {
                        if (disabled)
                            return;
                        if (selectionMode !== "none")
                            handleToggleItemSelection(item, itemIndex);
                        onItemClick?.(item, itemIndex);
                    }, children: renderRowChrome(item, itemIndex, renderRow(item, {
                        index: itemIndex,
                        selected: isSelected,
                        active,
                        disabled,
                    }), processedItems.length) }, key));
            }) }));
    }, [
        activeColumns,
        gap,
        getItemKey,
        selectedKeySet,
        isItemDisabled,
        activeIndex,
        getItemIdResolved,
        resolvedItemRole,
        selectionMode,
        processedItems.length,
        itemClassName,
        onItemClick,
        renderRow,
        renderRowChrome,
        handleToggleItemSelection,
    ]);
    return { renderVirtualGridRow };
}
