import { useCallback, useId } from "react";
import { useArrowHint } from "../../../lib/use-arrow-hint.js";
import { useDataListColumns } from "./useDataListColumns.js";
import { useDataListImperative } from "./useDataListImperative.js";
import { useDataListKeyboard } from "./useDataListKeyboard.js";
import { useDataListLoadMore } from "./useDataListLoadMore.js";
import { useDataListPagination } from "./useDataListPagination.js";
import { useDataListRenderers } from "./useDataListRenderers.js";
import { useDataListReorder } from "./useDataListReorder.js";
import { useDataListSearch } from "./useDataListSearch.js";
import { useDataListSelection } from "./useDataListSelection.js";
import { useDataListSort } from "./useDataListSort.js";
import { useDataListVirtualGridRow } from "./useDataListVirtualGridRow.js";
import { resolveContainerRole, resolveItemRole } from "./utils.js";
export function useDataListView(props, refs) {
    const { mode = "virtual", role: customRole, itemRole: customItemRole, selectionMode = "none", interactive = true, arrowHint, getItemId, } = props;
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
    const getItemIdResolved = useCallback((index) => getItemId?.(index) ?? `${generatedId}-item-${index}`, [getItemId, generatedId]);
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
