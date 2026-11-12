import { useCallback, type ReactNode } from "react";
import { VirtualList } from "@/components/ui/VirtualList/index";
import { cn } from "@/lib/utils";
import { DataTableHeaderRow, renderTableRowCells } from "@/components/blocks/dataTableParts";
import type { DataTableColumn, DataTableSort } from "@/components/blocks/dataTableTypes";

interface DataTableWideProps<T> {
  caption: string;
  columns: readonly DataTableColumn<T>[];
  rows: readonly T[];
  getRowId: (row: T, index: number) => string | number;
  gridTemplate: string;
  tableMinWidth: number;
  sort: DataTableSort | null;
  toggleSort: (columnId: string) => void;
  rowHeight: number;
  autoRowHeight: boolean;
  height: number;
  onRowClick?: (row: T, index: number) => void;
  emptyState: ReactNode;
}

export function DataTableWide<T>({
  caption,
  columns,
  rows,
  getRowId,
  gridTemplate,
  tableMinWidth,
  sort,
  toggleSort,
  rowHeight,
  autoRowHeight,
  height,
  onRowClick,
  emptyState,
}: DataTableWideProps<T>) {
  const renderRow = useCallback((row: T) => renderTableRowCells(row, columns), [columns]);

  return (
    // The grid is wider than the viewport below `tableMinWidth`, so this wrapper
    // scrolls. SC 2.1.1 needs that scrolling to be reachable without a pointer,
    // and a bare tabindex would announce as an unlabelled stop - hence the named
    // region. Cells hold no focusable content of their own when no column sorts.
    <div
      className="focus-ring overflow-x-auto rounded-xl border border-border bg-background"
      tabIndex={0}
      role="region"
      aria-label={`${caption}, scrollable horizontally`}
    >
      <div
        role="table"
        aria-label={caption}
        aria-rowcount={rows.length + 1}
        aria-colcount={columns.length}
        style={{ minWidth: `${tableMinWidth}px` }}
      >
        <div role="rowgroup">
          {/* Raw grid: the template is computed per column set, so `Grid`'s
              fixed `columns` tiers cannot express it. */}
          <DataTableHeaderRow columns={columns} gridTemplate={gridTemplate} sort={sort} toggleSort={toggleSort} />
        </div>

        <VirtualList
          items={rows}
          itemHeight={rowHeight}
          dynamic={autoRowHeight}
          height={height}
          role="rowgroup"
          itemRole="row"
          interactive={Boolean(onRowClick)}
          label={caption}
          getItemKey={getRowId}
          onItemSelect={onRowClick}
          renderItem={renderRow}
          emptyState={emptyState}
          itemStyle={{ display: "grid", gridTemplateColumns: gridTemplate }}
          itemClassName={cn(
            "border-b border-border transition-colors motion-feedback data-[active]:bg-primary-500/8 dark:data-[active]:bg-primary-400/15 hover:bg-primary-500/8 dark:hover:bg-primary-400/15 active:bg-primary-500/15 dark:active:bg-primary-400/25",
            onRowClick && "cursor-pointer",
          )}
        />
      </div>
    </div>
  );
}
