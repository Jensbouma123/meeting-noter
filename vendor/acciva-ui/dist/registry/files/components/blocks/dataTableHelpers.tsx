import type { CSSProperties, ReactNode } from "react";
import type { DataTableColumn } from "@/components/blocks/dataTableTypes";

export function columnText<T>(column: DataTableColumn<T>, row: T): string {
  if (column.searchValue) return column.searchValue(row);
  if (column.sortValue) return String(column.sortValue(row));
  return "";
}

export function compareValues(a: string | number, b: string | number): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
}

/** Clamped cells still need the full text for a mouse-hover tooltip since the CSS clamp only hides it visually. */
export function clampTitle<T>(column: DataTableColumn<T>, row: T): string | undefined {
  if (!column.wrap || !column.maxLines) return undefined;
  return columnText(column, row) || undefined;
}

export function renderCellValue<T>(column: DataTableColumn<T>, row: T): ReactNode {
  const content = column.cell(row);
  if (!column.wrap || !column.maxLines) return content;
  const clampStyle: CSSProperties = {
    display: "-webkit-box",
    WebkitBoxOrient: "vertical",
    WebkitLineClamp: column.maxLines,
    overflow: "hidden",
  };
  return (
    <span className="block min-w-0 wrap-anywhere whitespace-normal" style={clampStyle}>
      {content}
    </span>
  );
}
