import { useCallback, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { DataListProps } from "@/components/ui/DataList/DataListProps";
import type { DataListItemRole, DataListItemState } from "@/components/ui/DataList/types";
import { defaultKeyExtractor } from "@/components/ui/DataList/utils";

interface DataListVirtualGridRowNav<T> {
  activeColumns: number;
  processedItems: readonly T[];
  selectedKeySet: Set<string | number>;
  activeIndex: number;
  getItemIdResolved: (index: number) => string;
  resolvedItemRole: DataListItemRole;
  renderRow: (item: T, state: DataListItemState) => ReactNode;
  renderRowChrome: (item: T, index: number, content: ReactNode, total: number) => ReactNode;
  handleToggleItemSelection: (item: T, index: number) => void;
}

export function useDataListVirtualGridRow<T>(props: DataListProps<T>, nav: DataListVirtualGridRowNav<T>) {
  const {
    gap = 16,
    getItemKey = defaultKeyExtractor,
    isItemDisabled,
    selectionMode = "none",
    itemClassName,
    onItemClick,
  } = props;
  const {
    activeColumns,
    processedItems,
    selectedKeySet,
    activeIndex,
    getItemIdResolved,
    resolvedItemRole,
    renderRow,
    renderRowChrome,
    handleToggleItemSelection,
  } = nav;

  const renderVirtualGridRow = useCallback(
    (rowItems: T[], rowState: { index: number }) => {
      return (
        // Raw grid: the template and gap are computed from `activeColumns` and the
        // `gap` prop at runtime, which `Grid`'s fixed tiers cannot express.
        <div
          className="grid w-full h-full"
          style={{
            gridTemplateColumns: `repeat(${activeColumns}, minmax(0, 1fr))`,
            gap: typeof gap === "number" ? `${gap}px` : gap,
          }}
        >
          {rowItems.map((item, colIdx) => {
            const itemIndex = rowState.index * activeColumns + colIdx;
            const key = getItemKey(item, itemIndex);
            const isSelected = selectedKeySet.has(key);
            const disabled = isItemDisabled ? isItemDisabled(item, itemIndex) : false;
            const active = itemIndex === activeIndex;

            return (
              <div
                key={key}
                id={getItemIdResolved(itemIndex)}
                data-index={itemIndex}
                role={resolvedItemRole}
                aria-selected={selectionMode !== "none" ? isSelected : undefined}
                aria-disabled={disabled || undefined}
                aria-setsize={processedItems.length}
                aria-posinset={itemIndex + 1}
                // Raw flex: `itemClassName` is consumer-supplied and lands in the same
                // class string, so a `Stack`'s own alignment classes could collide with it.
                className={cn(
                  "relative h-full flex flex-col",
                  itemClassName,
                  (selectionMode !== "none" || onItemClick) && !disabled && "cursor-pointer",
                )}
                onClick={() => {
                  if (disabled) return;
                  if (selectionMode !== "none") handleToggleItemSelection(item, itemIndex);
                  onItemClick?.(item, itemIndex);
                }}
              >
                {renderRowChrome(
                  item,
                  itemIndex,
                  renderRow(item, {
                    index: itemIndex,
                    selected: isSelected,
                    active,
                    disabled,
                  }),
                  processedItems.length,
                )}
              </div>
            );
          })}
        </div>
      );
    },
    [
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
    ],
  );

  return { renderVirtualGridRow };
}
