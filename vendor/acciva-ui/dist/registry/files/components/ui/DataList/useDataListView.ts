import { useCallback, useId, type RefObject } from "react";
import type { VirtualListHandle } from "@/components/ui/VirtualList/index";
import { useArrowHint } from "@/lib/use-arrow-hint";
import type { DataListProps } from "@/components/ui/DataList/DataListProps";
import { useDataListColumns } from "@/components/ui/DataList/useDataListColumns";
import { useDataListImperative } from "@/components/ui/DataList/useDataListImperative";
import { useDataListKeyboard } from "@/components/ui/DataList/useDataListKeyboard";
import { useDataListLoadMore } from "@/components/ui/DataList/useDataListLoadMore";
import { useDataListPagination } from "@/components/ui/DataList/useDataListPagination";
import { useDataListRenderers } from "@/components/ui/DataList/useDataListRenderers";
import { useDataListReorder } from "@/components/ui/DataList/useDataListReorder";
import { useDataListSearch } from "@/components/ui/DataList/useDataListSearch";
import { useDataListSelection } from "@/components/ui/DataList/useDataListSelection";
import { useDataListSort } from "@/components/ui/DataList/useDataListSort";
import { useDataListVirtualGridRow } from "@/components/ui/DataList/useDataListVirtualGridRow";
import { resolveContainerRole, resolveItemRole } from "@/components/ui/DataList/utils";

export interface DataListRefs {
  listContainerRef: RefObject<HTMLDivElement | null>;
  virtualListRef: RefObject<VirtualListHandle | null>;
  sentinelRef: RefObject<HTMLDivElement | null>;
}

export function useDataListView<T>(props: DataListProps<T>, refs: DataListRefs) {
  const {
    mode = "virtual",
    role: customRole,
    itemRole: customItemRole,
    selectionMode = "none",
    interactive = true,
    arrowHint,
    getItemId,
  } = props;
  const ariaLabel = props["aria-label"] ?? props.ariaLabel;
  const ariaLabelledBy = props["aria-labelledby"] ?? props.ariaLabelledBy;
  const ariaDescribedBy = props["aria-describedby"] ?? props.ariaDescribedBy;

  const generatedId = useId();
  const searchInputId = `${generatedId}-search`;
  const statusRegionId = `${generatedId}-status`;
  const { listContainerRef, virtualListRef, sentinelRef } = refs;

  const search = useDataListSearch(props);
  const sort = useDataListSort(props, search.filteredItems);
  const selection = useDataListSelection(props, sort.processedItems);
  const pagination = useDataListPagination(props, sort.processedItems);
  const resultKey = `${pagination.totalItems}|${search.deferredSearchQuery}|${sort.activeSortKey}|${sort.activeSortDirection}`;
  const reorder = useDataListReorder(props, resultKey);
  const columnState = useDataListColumns(props, sort.processedItems, listContainerRef);
  useDataListLoadMore(props, sentinelRef);
  const renderers = useDataListRenderers(props, reorder.handleReorderMove);

  const resolvedContainerRole = resolveContainerRole(customRole, mode, selectionMode);
  const resolvedItemRole = resolveItemRole(customItemRole, resolvedContainerRole);
  const getItemIdResolved = useCallback(
    (index: number) => getItemId?.(index) ?? `${generatedId}-item-${index}`,
    [getItemId, generatedId],
  );

  const virtualGrid = useDataListVirtualGridRow(props, {
    activeColumns: columnState.activeColumns,
    processedItems: sort.processedItems,
    selectedKeySet: selection.selectedKeySet,
    activeIndex: reorder.activeIndex,
    getItemIdResolved,
    resolvedItemRole,
    renderRow: renderers.renderRow,
    renderRowChrome: renderers.renderRowChrome,
    handleToggleItemSelection: selection.handleToggleItemSelection,
  });

  const handleContainerKeyDown = useDataListKeyboard(props, {
    processedItems: sort.processedItems,
    activeColumns: columnState.activeColumns,
    activeIndex: reorder.activeIndex,
    setActiveIndex: reorder.setActiveIndex,
    handleToggleItemSelection: selection.handleToggleItemSelection,
    handleReorderMove: reorder.handleReorderMove,
  });

  useDataListImperative(props, {
    activeColumns: columnState.activeColumns,
    virtualListRef,
    listContainerRef,
    handleClearSelection: selection.handleClearSelection,
    handleSelectAll: selection.handleSelectAll,
  });

  const listHint = useArrowHint("list", interactive ? arrowHint : false, "Use arrow keys to move between items");

  return {
    ...search,
    ...sort,
    ...selection,
    ...pagination,
    ...reorder,
    ...columnState,
    ...renderers,
    ...virtualGrid,
    handleContainerKeyDown,
    ariaLabel,
    ariaLabelledBy,
    ariaDescribedBy,
    generatedId,
    searchInputId,
    statusRegionId,
    resolvedContainerRole,
    resolvedItemRole,
    getItemIdResolved,
    listHint,
  };
}

export type DataListView<T> = ReturnType<typeof useDataListView<T>>;
