import type { RefObject } from "react";
import { VirtualList, type VirtualListHandle } from "@/components/ui/VirtualList/index";
import { cn } from "@/lib/utils";
import type { DataListProps } from "@/components/ui/DataList/DataListProps";
import type { DataListView } from "@/components/ui/DataList/useDataListView";
import {
  DEFAULT_ITEM_HEIGHT_LIST,
  DEFAULT_VIRTUAL_HEIGHT,
  defaultKeyExtractor,
  toVirtualItemRole,
  toVirtualRole,
} from "@/components/ui/DataList/utils";

interface DataListVirtualListProps<T> {
  props: DataListProps<T>;
  view: DataListView<T>;
  virtualListRef: RefObject<VirtualListHandle | null>;
}

export function DataListVirtualList<T>({ props, view, virtualListRef }: DataListVirtualListProps<T>) {
  const {
    itemHeight,
    height = DEFAULT_VIRTUAL_HEIGHT,
    overscan = 4,
    dynamic = false,
    arrowHint,
    interactive = true,
    selectionMode = "none",
    getItemKey = defaultKeyExtractor,
    isItemDisabled,
    onItemClick,
    onVisibleRangeChange,
    listClassName,
    itemClassName,
  } = props;

  return (
    <VirtualList
      listRef={virtualListRef}
      items={view.processedItems}
      itemHeight={
        typeof itemHeight === "function"
          ? (idx) => (itemHeight as (index: number, item: T) => number)(idx, view.processedItems[idx])
          : typeof itemHeight === "number"
            ? itemHeight
            : DEFAULT_ITEM_HEIGHT_LIST
      }
      height={height}
      overscan={overscan}
      dynamic={dynamic}
      role={toVirtualRole(view.resolvedContainerRole)}
      itemRole={toVirtualItemRole(view.resolvedItemRole)}
      aria-label={view.ariaLabel}
      aria-labelledby={view.ariaLabelledBy}
      aria-describedby={view.ariaDescribedBy}
      arrowHint={arrowHint}
      interactive={interactive}
      getItemKey={getItemKey}
      getItemId={view.getItemIdResolved}
      isItemDisabled={isItemDisabled}
      isItemSelected={(item, idx) => view.selectedKeySet.has(getItemKey(item, idx))}
      onItemSelect={(item, idx) => {
        if (selectionMode !== "none") view.handleToggleItemSelection(item, idx);
        onItemClick?.(item, idx);
      }}
      onVisibleRangeChange={onVisibleRangeChange}
      className={cn("focus-ring rounded-xl border border-border bg-background p-2", listClassName)}
      itemClassName={cn(
        "px-1 py-1 transition-colors data-active:bg-primary-500/8 dark:data-active:bg-primary-400/15 hover:bg-primary-500/8 dark:hover:bg-primary-400/15",
        (selectionMode !== "none" || onItemClick) && "cursor-pointer",
        itemClassName,
      )}
      renderItem={(item, state) =>
        view.renderRowChrome(
          item,
          state.index,
          view.renderRow(item, {
            index: state.index,
            selected: state.selected,
            active: state.active,
            disabled: state.disabled,
          }),
          view.processedItems.length,
        )
      }
    />
  );
}
