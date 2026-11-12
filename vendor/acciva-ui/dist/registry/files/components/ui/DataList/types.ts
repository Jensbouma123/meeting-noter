import type { ReactNode } from "react";

export type DataListMode = "virtual" | "paginated" | "infinite";
export type DataListLayout = "list" | "grid";
export type DataListSelectionMode = "none" | "single" | "multiple";
export type DataListRole = "list" | "feed" | "listbox" | "grid";
export type DataListItemRole = "listitem" | "article" | "option" | "row";
export type DataListSortDirection = "asc" | "desc";

export interface DataListItemState {
  index: number;
  selected: boolean;
  active: boolean;
  disabled: boolean;
}

/** One per-row action: an overflow-menu item on web, a swipe action on Apple. */
export interface DataListRowAction<T> {
  /** Stable React key within the row's menu. */
  key: string;
  /** Menu item label, announced by assistive tech (SC 4.1.2). */
  label: string;
  icon?: ReactNode;
  destructive?: boolean;
  disabled?: boolean;
  onSelect: (item: T, index: number) => void;
}

/**
 * A single-item reorder. `to` is the item's final index after the move. The list
 * never reorders itself — apply the move to `items` in this callback's owner.
 */
export interface DataListReorderMove {
  from: number;
  to: number;
}

export interface DataListSortOption<T> {
  key: string;
  label: string;
  compare?: (a: T, b: T) => number;
}

export type DataListColumnAlign = "start" | "end";

export interface DataListTableColumn<T> {
  /** Stable React key for the column. */
  key: string;
  /** Column heading. Shown visually in the header row and read before each cell (SC 1.3.1). */
  header: ReactNode;
  /** `end` right-aligns the column, the usual choice for amounts. Defaults to `start`. */
  align?: DataListColumnAlign;
  /** Applies `tabular-nums` so digits share one width and decimals line up. */
  numeric?: boolean;
  /** Renders this column's cell for one item. */
  cell: (item: T, index: number) => ReactNode;
}

export interface DataListResponsiveCols {
  sm?: number;
  md?: number;
  lg?: number;
  xl?: number;
}

export interface DataListHandle {
  scrollToIndex: (index: number) => void;
  scrollToOffset: (offset: number) => void;
  getScrollElement: () => HTMLElement | null;
  clearSelection: () => void;
  selectAll: () => void;
}
