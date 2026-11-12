import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import type { ReactNode } from "react";
import { HStack } from "@/components/ui/HStack";
import { Text } from "@/components/ui/Text";
import { VStack } from "@/components/ui/VStack";
import { cn } from "@/lib/utils";
import { alignClasses } from "@/components/blocks/dataTableConstants";
import { clampTitle, renderCellValue } from "@/components/blocks/dataTableHelpers";
import type { DataTableColumn, DataTableSort } from "@/components/blocks/dataTableTypes";

export function renderTableRowCells<T>(row: T, columns: readonly DataTableColumn<T>[]): ReactNode {
  return (
    <>
      {columns.map((column, columnIndex) => (
        <div
          key={column.id}
          role="cell"
          aria-colindex={columnIndex + 1}
          title={clampTitle(column, row)}
          className={cn(
            "flex min-w-0 overflow-hidden px-4 text-sm text-foreground",
            column.wrap ? "items-start wrap-anywhere whitespace-normal py-3" : "items-center truncate",
            alignClasses[column.align ?? "left"],
          )}
        >
          {renderCellValue(column, row)}
        </div>
      ))}
    </>
  );
}

interface DataTableHeaderRowProps<T> {
  columns: readonly DataTableColumn<T>[];
  gridTemplate: string;
  sort: DataTableSort | null;
  toggleSort: (columnId: string) => void;
}

export function DataTableHeaderRow<T>({ columns, gridTemplate, sort, toggleSort }: DataTableHeaderRowProps<T>) {
  return (
    <div
      role="row"
      aria-rowindex={1}
      className="grid border-b border-border bg-surface"
      style={{ gridTemplateColumns: gridTemplate }}
    >
      {columns.map((column, columnIndex) => {
        const sortable = column.sortable !== false && Boolean(column.sortValue);
        const active = sort?.columnId === column.id;
        return (
          <div
            key={column.id}
            role="columnheader"
            aria-colindex={columnIndex + 1}
            aria-sort={active ? (sort?.direction === "asc" ? "ascending" : "descending") : sortable ? "none" : undefined}
            className={cn("flex items-center", alignClasses[column.align ?? "left"])}
          >
            {sortable ? (
              <button
                type="button"
                onClick={() => toggleSort(column.id)}
                 className="focus-ring flex h-11 w-full items-center gap-2 px-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground transition-colors motion-feedback hover:text-foreground active:text-foreground"
              >
                {column.header}
                {active ? (
                  sort?.direction === "asc" ? (
                    <ArrowUp className="size-3.5 text-primary-800 dark:text-primary-300" />
                  ) : (
                    <ArrowDown className="size-3.5 text-primary-800 dark:text-primary-300" />
                  )
                ) : (
                  <ChevronsUpDown className="size-3.5 opacity-50" />
                )}
              </button>
            ) : (
              <Text
                as="span"
                size="xs"
                weight="semibold"
                variant="muted"
                className="flex h-11 w-full items-center px-4 uppercase tracking-wide"
              >
                {column.header}
              </Text>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function renderDataTableCard<T>(
  row: T,
  cardColumns: readonly DataTableColumn<T>[],
  primaryColumn: DataTableColumn<T> | undefined,
): ReactNode {
  return (
    <div className="px-1 pb-3">
      <VStack spacing="sm" inset="lg" className="rounded-xl border border-border bg-surface">
        <Text
          as="span"
          size="sm"
          weight="semibold"
          className={cn(primaryColumn?.wrap && "wrap-anywhere")}
          title={primaryColumn ? clampTitle(primaryColumn, row) : undefined}
        >
          {primaryColumn ? renderCellValue(primaryColumn, row) : null}
        </Text>
        {/* Raw grid: `Grid` renders a `div`, and this list of pairs must stay a `dl`. */}
        <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-x-6">
          {cardColumns
            .filter((column) => column.id !== primaryColumn?.id)
            .map((column) => (
              <HStack key={column.id} spacing="md" align="baseline" justify="between">
                <dt className="text-xs font-medium text-muted-foreground">{column.header}</dt>
                <dd
                  title={clampTitle(column, row)}
                  className={cn(
                    "text-sm text-foreground",
                    column.wrap ? "min-w-0 flex-1 wrap-anywhere whitespace-normal text-right" : "truncate",
                  )}
                >
                  {renderCellValue(column, row)}
                </dd>
              </HStack>
            ))}
        </dl>
      </VStack>
    </div>
  );
}
