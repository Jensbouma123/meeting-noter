import { useEffect, type RefObject } from "react";
import { VirtualList, type VirtualListHandle } from "@/components/ui/VirtualList/index";
import { cn } from "@/lib/utils";
import { DataListArrowHint } from "@/components/ui/DataList/DataListArrowHint";
import type { DataListProps } from "@/components/ui/DataList/DataListProps";
import type { DataListView } from "@/components/ui/DataList/useDataListView";
import { DEFAULT_ITEM_HEIGHT_GRID, DEFAULT_VIRTUAL_HEIGHT, toVirtualRole } from "@/components/ui/DataList/utils";

interface DataListVirtualGridProps<T> {
  props: DataListProps<T>;
  view: DataListView<T>;
  virtualListRef: RefObject<VirtualListHandle | null>;
}

export function DataListVirtualGrid<T>({ props, view, virtualListRef }: DataListVirtualGridProps<T>) {
  const { itemHeight, height = DEFAULT_VIRTUAL_HEIGHT, overscan = 4, dynamic = false, interactive = true, listClassName } =
    props;
  const { activeIndex, activeColumns, handleContainerKeyDown } = view;

  // The roving index is a cell index; keep the row that holds it scrolled into view.
  useEffect(() => {
    if (interactive) virtualListRef.current?.scrollToIndex(Math.floor(activeIndex / activeColumns));
  }, [interactive, activeIndex, activeColumns, virtualListRef]);

  // VirtualList's own row-level keys are off (`interactive={false}`): the cell keyboard
  // model runs on this wrapper, so Enter/Space and Left/Right reach the grid cells.
  return (
    <div {...view.listHint.groupProps} onKeyDown={handleContainerKeyDown} className="relative">
      <VirtualList
        listRef={virtualListRef}
        items={view.virtualRows}
        itemHeight={
          typeof itemHeight === "number"
            ? itemHeight
            : DEFAULT_ITEM_HEIGHT_GRID
        }
        height={height}
        overscan={overscan}
        dynamic={dynamic}
        role={toVirtualRole(view.resolvedContainerRole)}
        itemRole="presentation"
        aria-label={view.ariaLabel}
        aria-labelledby={view.ariaLabelledBy}
        aria-describedby={view.listHint.describedBy(view.ariaDescribedBy)}
        interactive={false}
        className={cn("focus-ring rounded-xl border border-border bg-background p-3", listClassName)}
        renderItem={view.renderVirtualGridRow}
        getItemKey={(_, rowIdx) => `row-${rowIdx}`}
      />
      <DataListArrowHint hint={view.listHint} />
    </div>
  );
}
