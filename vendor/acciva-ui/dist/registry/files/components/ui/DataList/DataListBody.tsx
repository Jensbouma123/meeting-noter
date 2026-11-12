import type { RefObject } from "react";
import type { VirtualListHandle } from "@/components/ui/VirtualList/index";
import { DataListInfiniteList } from "@/components/ui/DataList/DataListInfiniteList";
import type { DataListProps } from "@/components/ui/DataList/DataListProps";
import { DataListPaginatedList } from "@/components/ui/DataList/DataListPaginatedList";
import { DataListEmpty, DataListLoading } from "@/components/ui/DataList/DataListStates";
import { DataListVirtualGrid } from "@/components/ui/DataList/DataListVirtualGrid";
import { DataListVirtualList } from "@/components/ui/DataList/DataListVirtualList";
import type { DataListView } from "@/components/ui/DataList/useDataListView";

interface DataListBodyProps<T> {
  props: DataListProps<T>;
  view: DataListView<T>;
  virtualListRef: RefObject<VirtualListHandle | null>;
  sentinelRef: RefObject<HTMLDivElement | null>;
}

export function DataListBody<T>({ props, view, virtualListRef, sentinelRef }: DataListBodyProps<T>) {
  const { loading = false, loadingState, emptyState, emptyMessage = "No items found", mode = "virtual", layout = "list" } =
    props;

  if (loading) return loadingState ?? <DataListLoading />;

  if (view.processedItems.length === 0) {
    return (
      emptyState ?? (
        <DataListEmpty
          message={emptyMessage}
          searchQuery={view.activeSearchQuery}
          onClearSearch={() => view.handleSearchChange("")}
        />
      )
    );
  }

  if (mode === "virtual") {
    return layout === "grid" ? (
      <DataListVirtualGrid props={props} view={view} virtualListRef={virtualListRef} />
    ) : (
      <DataListVirtualList props={props} view={view} virtualListRef={virtualListRef} />
    );
  }

  if (mode === "paginated") return <DataListPaginatedList props={props} view={view} />;

  return <DataListInfiniteList props={props} view={view} sentinelRef={sentinelRef} />;
}
