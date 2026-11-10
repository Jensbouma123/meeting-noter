"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef } from "react";
import { VStack } from "../VStack.js";
import { cn } from "../../../lib/utils.js";
import { DataListBody } from "./DataListBody.js";
import { DataListColumnHeader } from "./DataListColumnHeader.js";
import { DataListPagination } from "./DataListPagination.js";
import { DataListToolbar } from "./DataListToolbar.js";
import { useDataListView } from "./useDataListView.js";
export function DataList(props) {
    const { header, footer, toolbar, className, searchable = false, sortable = false, selectionMode = "none", showSelectionToolbar = true, tableColumns, showColumnHeaders = true, paginationPlacement = "bottom", loading = false, } = props;
    const listContainerRef = useRef(null);
    const virtualListRef = useRef(null);
    const sentinelRef = useRef(null);
    const view = useDataListView(props, { listContainerRef, virtualListRef, sentinelRef });
    const pagination = _jsx(DataListPagination, { props: props, view: view });
    return (_jsxs(VStack, { ref: listContainerRef, spacing: "md", className: cn("w-full", className), "aria-labelledby": view.ariaLabelledBy, "aria-describedby": view.ariaDescribedBy, children: [header, (searchable || sortable || toolbar || (selectionMode === "multiple" && showSelectionToolbar)) && (_jsx(DataListToolbar, { props: props, view: view })), _jsx("span", { id: view.statusRegionId, role: "status", "aria-live": "polite", className: "sr-only", children: loading
                    ? "Loading list items..."
                    : (view.visibleReorderNote ||
                        `${view.processedItems.length} items available${view.activeSearchQuery ? ` matching "${view.activeSearchQuery}"` : ""}`) }), (paginationPlacement === "top" || paginationPlacement === "both") && pagination, tableColumns && showColumnHeaders && (_jsx(DataListColumnHeader, { columns: tableColumns, template: view.columnTemplate })), _jsx(DataListBody, { props: props, view: view, virtualListRef: virtualListRef, sentinelRef: sentinelRef }), (paginationPlacement === "bottom" || paginationPlacement === "both") && pagination, footer] }));
}
