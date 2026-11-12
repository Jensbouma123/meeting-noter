import { useMemo } from "react";
import { DEFAULT_MIN_COLUMN_WIDTH } from "@/components/blocks/dataTableConstants";
import type { DataTableColumn } from "@/components/blocks/dataTableTypes";

export function useDataTableLayout<T>(columns: readonly DataTableColumn<T>[]) {
  const gridTemplate = useMemo(
    () => columns.map((column) => column.width ?? `minmax(${column.minWidthPx ?? DEFAULT_MIN_COLUMN_WIDTH}px, 1fr)`).join(" "),
    [columns],
  );

  const tableMinWidth = useMemo(
    () => columns.reduce((total, column) => total + (column.minWidthPx ?? DEFAULT_MIN_COLUMN_WIDTH), 0),
    [columns],
  );

  const cardColumns = useMemo(() => columns.filter((column) => !column.hideOnCard), [columns]);
  const primaryColumn = useMemo(() => columns.find((column) => column.primary) ?? columns[0], [columns]);

  return { gridTemplate, tableMinWidth, cardColumns, primaryColumn };
}
