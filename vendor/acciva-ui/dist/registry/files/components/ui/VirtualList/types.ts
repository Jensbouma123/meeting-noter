import type { CSSProperties, ReactNode, Ref } from "react";

export type VirtualListAlignment = "auto" | "start" | "center" | "end";
export type VirtualListRole = "list" | "listbox" | "rowgroup" | "presentation";
export type VirtualListScrollToTopPlacement = "bottom-right" | "bottom-left" | "bottom-center";

export interface VirtualListScrollToTopOptions {
  placement?: VirtualListScrollToTopPlacement;
  label?: string;
  fullWidth?: boolean;
  threshold?: number;
  className?: string;
}

export type VirtualListItemRole = "listitem" | "option" | "row" | "presentation";

export interface VirtualListHandle {
  scrollToIndex: (index: number, align?: VirtualListAlignment) => void;
  scrollToOffset: (offset: number) => void;
  measureAll: () => void;
  getScrollElement: () => HTMLDivElement | null;
}

export interface VirtualListItemState {
  index: number;
  active: boolean;
  selected: boolean;
  disabled: boolean;
}

export interface VirtualListRange {
  start: number;
  end: number;
}

export interface VirtualListProps<T> {
  items: readonly T[];
  itemHeight: number | ((index: number, item: T) => number);
  renderItem: (item: T, state: VirtualListItemState) => ReactNode;
  height?: number | string;
  overscan?: number;
  dynamic?: boolean;
  getItemKey?: (item: T, index: number) => string | number;
  getItemId?: (index: number) => string;
  isItemDisabled?: (item: T, index: number) => boolean;
  isItemSelected?: (item: T, index: number) => boolean;
  onItemSelect?: (item: T, index: number) => void;
  activeIndex?: number;
  defaultActiveIndex?: number;
  onActiveIndexChange?: (index: number) => void;
  interactive?: boolean;
  role?: VirtualListRole;
  itemRole?: VirtualListItemRole;
  /** @deprecated Use `aria-label`. Loses to it when both are set. */
  label?: string;
  /** @deprecated Use `aria-labelledby`. Loses to it when both are set. */
  labelledBy?: string;
  /** @deprecated Use `aria-describedby`. Loses to it when both are set. */
  describedBy?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  className?: string;
  itemClassName?: string;
  itemStyle?: CSSProperties;
  emptyState?: ReactNode;
  onVisibleRangeChange?: (range: VirtualListRange) => void;
  listRef?: Ref<VirtualListHandle>;
  scrollToTop?: boolean | VirtualListScrollToTopOptions;
  /** First-keyboard-focus caption for the list; `false` disables it. */
  arrowHint?: string | false;
}
