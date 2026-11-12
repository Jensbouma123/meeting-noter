import type { ReactNode } from "react";
import type { DataTableColumn } from "@/components/blocks/DataTable";

export interface ListDetailViewProps<T> {
  items: readonly T[];
  mode?: "table" | "list";
  columns?: readonly DataTableColumn<T>[];
  renderListItem?: (item: T, index: number, isSelected: boolean) => ReactNode;
  getItemKey: (item: T, index: number) => string | number;
  caption: string;
  selectedItem?: T | null;
  onSelectItem?: (item: T | null) => void;
  renderDetail: (item: T, onClose: () => void) => ReactNode;
  detailTitle?: ReactNode | ((item: T) => ReactNode);
  searchable?: boolean;
  searchPlaceholder?: string;
  height?: number;
  rowHeight?: number;
  emptyMessage?: string;
  toolbar?: ReactNode;
  className?: string;
  /** First-keyboard-focus caption; `false` disables it. */
  arrowHint?: string | false;
}
