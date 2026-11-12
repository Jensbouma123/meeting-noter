"use client";

import { useRef } from "react";
import type { VirtualListHandle } from "@/components/ui/VirtualList/index";
import { VStack } from "@/components/ui/VStack";
import { cn } from "@/lib/utils";
import { DataListBody } from "@/components/ui/DataList/DataListBody";
import { DataListColumnHeader } from "@/components/ui/DataList/DataListColumnHeader";
import type { DataListProps } from "@/components/ui/DataList/DataListProps";
import { DataListPagination } from "@/components/ui/DataList/DataListPagination";
import { DataListToolbar } from "@/components/ui/DataList/DataListToolbar";
import { useDataListView } from "@/components/ui/DataList/useDataListView";

export function DataList<T>(props: DataListProps<T>) {
  const {
    header,
    footer,
    toolbar,
    className,
    searchable = false,
    sortable = false,
    selectionMode = "none",
    showSelectionToolbar = true,
    tableColumns,
    showColumnHeaders = true,
    paginationPlacement = "bottom",
    loading = false,
  } = props;
  const listContainerRef = useRef<HTMLDivElement>(null);
  const virtualListRef = useRef<VirtualListHandle>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const view = useDataListView(props, { listContainerRef, virtualListRef, sentinelRef });
  const pagination = <DataListPagination props={props} view={view} />;

  return (
    <VStack
      ref={listContainerRef}
      spacing="md"
      className={cn("w-full", className)}
      aria-labelledby={view.ariaLabelledBy}
      aria-describedby={view.ariaDescribedBy}
    >
      {/* Header Slot */}
      {header}

      {/* Toolbar: Search, Sort, Selection actions */}
      {(searchable || sortable || toolbar || (selectionMode === "multiple" && showSelectionToolbar)) && (
        <DataListToolbar props={props} view={view} />
      )}

      {/* Screen Reader Polite Live Region */}
      <span id={view.statusRegionId} role="status" aria-live="polite" className="sr-only">
        {loading
          ? "Loading list items..."
          : (view.visibleReorderNote ||
            `${view.processedItems.length} items available${view.activeSearchQuery ? ` matching "${view.activeSearchQuery}"` : ""}`)}
      </span>

      {/* Top Pagination if configured */}
      {(paginationPlacement === "top" || paginationPlacement === "both") && pagination}

      {/* Column header row for `tableColumns`. Visual only: each cell announces its header. */}
      {tableColumns && showColumnHeaders && (
        <DataListColumnHeader columns={tableColumns} template={view.columnTemplate} />
      )}

      {/* Main List Body */}
      <DataListBody props={props} view={view} virtualListRef={virtualListRef} sentinelRef={sentinelRef} />

      {/* Bottom Pagination if configured */}
      {(paginationPlacement === "bottom" || paginationPlacement === "both") && pagination}

      {/* Footer Slot */}
      {footer}
    </VStack>
  );
}
