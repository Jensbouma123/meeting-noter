import type { DataListTableColumn } from "@/components/ui/DataList/types";
import { columnCellClass } from "@/components/ui/DataList/utils";

interface DataListColumnHeaderProps<T> {
  columns: readonly DataListTableColumn<T>[];
  template: string | undefined;
}

// Visual only: each cell announces its header.
export function DataListColumnHeader<T>({ columns, template }: DataListColumnHeaderProps<T>) {
  return (
    <div
      aria-hidden="true"
      className="grid items-center gap-3 px-1 text-xs font-medium text-muted-foreground"
      style={{ gridTemplateColumns: template }}
    >
      {columns.map((column) => (
        <div key={column.key} className={columnCellClass(column)}>
          {column.header}
        </div>
      ))}
    </div>
  );
}
