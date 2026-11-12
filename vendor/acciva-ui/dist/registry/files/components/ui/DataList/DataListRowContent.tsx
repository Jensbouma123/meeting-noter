import type { DataListTableColumn } from "@/components/ui/DataList/types";
import { columnCellClass } from "@/components/ui/DataList/utils";

interface DataListRowContentProps<T> {
  columns: readonly DataListTableColumn<T>[];
  template: string | undefined;
  item: T;
  index: number;
}

export function DataListRowContent<T>({ columns, template, item, index }: DataListRowContentProps<T>) {
  return (
    <div className="grid items-center gap-3" style={{ gridTemplateColumns: template }}>
      {columns.map((column) => (
        <div key={column.key} className={columnCellClass(column)}>
          {/* The header is visual only; each cell announces its column for AT (SC 1.3.1). */}
          <span className="sr-only">{column.header}: </span>
          {column.cell(item, index)}
        </div>
      ))}
    </div>
  );
}
