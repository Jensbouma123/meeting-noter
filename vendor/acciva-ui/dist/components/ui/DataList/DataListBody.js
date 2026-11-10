import { jsx as _jsx } from "react/jsx-runtime";
import { DataListInfiniteList } from "./DataListInfiniteList.js";
import { DataListPaginatedList } from "./DataListPaginatedList.js";
import { DataListEmpty, DataListLoading } from "./DataListStates.js";
import { DataListVirtualGrid } from "./DataListVirtualGrid.js";
import { DataListVirtualList } from "./DataListVirtualList.js";
export function DataListBody({ props, view, virtualListRef, sentinelRef }) {
    const { loading = false, loadingState, emptyState, emptyMessage = "No items found", mode = "virtual", layout = "list" } = props;
    if (loading)
        return loadingState ?? _jsx(DataListLoading, {});
    if (view.processedItems.length === 0) {
        return (emptyState ?? (_jsx(DataListEmpty, { message: emptyMessage, searchQuery: view.activeSearchQuery, onClearSearch: () => view.handleSearchChange("") })));
    }
    if (mode === "virtual") {
        return layout === "grid" ? (_jsx(DataListVirtualGrid, { props: props, view: view, virtualListRef: virtualListRef })) : (_jsx(DataListVirtualList, { props: props, view: view, virtualListRef: virtualListRef }));
    }
    if (mode === "paginated")
        return _jsx(DataListPaginatedList, { props: props, view: view });
    return _jsx(DataListInfiniteList, { props: props, view: view, sentinelRef: sentinelRef });
}
