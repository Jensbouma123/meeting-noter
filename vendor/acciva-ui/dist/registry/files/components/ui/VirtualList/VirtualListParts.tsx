import { ArrowUp } from "lucide-react";
import type { CSSProperties, ReactNode, RefCallback } from "react";
import { cn } from "@/lib/utils";
import { SCROLL_TO_TOP_EXTRA_SPACE } from "@/components/ui/VirtualList/constants";
import type {
  VirtualListItemRole,
  VirtualListProps,
  VirtualListRange,
  VirtualListScrollToTopOptions,
} from "@/components/ui/VirtualList/types";

interface VirtualListRowsProps<T> {
  items: readonly T[];
  range: VirtualListRange;
  count: number;
  resolvedActiveIndex: number;
  interactive: boolean;
  disabledAt: (index: number) => boolean;
  isItemSelected?: VirtualListProps<T>["isItemSelected"];
  dynamic: boolean;
  offsetAt: (index: number) => number;
  sizeAt: (index: number) => number;
  getItemKey?: VirtualListProps<T>["getItemKey"];
  itemId: (index: number) => string;
  registerItem: RefCallback<HTMLDivElement>;
  itemRole: VirtualListItemRole;
  itemClassName?: string;
  itemStyle?: CSSProperties;
  onItemSelect?: VirtualListProps<T>["onItemSelect"];
  renderItem: VirtualListProps<T>["renderItem"];
}

export function VirtualListRows<T>({
  items,
  range,
  count,
  resolvedActiveIndex,
  interactive,
  disabledAt,
  isItemSelected,
  dynamic,
  offsetAt,
  sizeAt,
  getItemKey,
  itemId,
  registerItem,
  itemRole,
  itemClassName,
  itemStyle,
  onItemSelect,
  renderItem,
}: VirtualListRowsProps<T>) {
  const rendered: ReactNode[] = [];
  for (let index = range.start; index < range.end; index++) {
    const item = items[index];
    const active = interactive && index === resolvedActiveIndex;
    const disabled = disabledAt(index);
    const selected = isItemSelected ? isItemSelected(item, index) : false;
    const positioned: CSSProperties = dynamic
      ? { position: "absolute", top: 0, left: 0, right: 0, transform: `translateY(${offsetAt(index)}px)` }
      : { position: "absolute", top: offsetAt(index), left: 0, right: 0, height: sizeAt(index) };

    rendered.push(
      <div
        key={getItemKey ? getItemKey(item, index) : index}
        id={itemId(index)}
        ref={registerItem}
        data-index={index}
        data-active={active || undefined}
        role={itemRole}
        aria-setsize={itemRole === "option" || itemRole === "listitem" ? count : undefined}
        aria-posinset={itemRole === "option" || itemRole === "listitem" ? index + 1 : undefined}
        aria-selected={itemRole === "option" ? selected : undefined}
        aria-disabled={disabled || undefined}
        aria-rowindex={itemRole === "row" ? index + 2 : undefined}
        onClick={onItemSelect && !disabled ? () => onItemSelect(item, index) : undefined}
        className={itemClassName}
        style={{ ...positioned, ...itemStyle }}
      >
        {renderItem(item, { index, active, selected, disabled })}
      </div>,
    );
  }
  return <>{rendered}</>;
}

interface VirtualListScrollToTopProps {
  options?: VirtualListScrollToTopOptions;
  visible: boolean;
  fullWidth: boolean;
  onClick: () => void;
}

export function VirtualListScrollToTop({ options, visible, fullWidth, onClick }: VirtualListScrollToTopProps) {
  const placement = options?.placement ?? "bottom-right";
  const label = options?.label;

  return (
    <div
      role="presentation"
      className={cn(
        "sticky bottom-0 left-0 right-0 z-10 pointer-events-none flex w-full items-center px-3 pb-3",
        placement === "bottom-left" && "justify-start",
        placement === "bottom-center" && "justify-center",
        placement === "bottom-right" && "justify-end",
      )}
      style={{
        marginTop: -SCROLL_TO_TOP_EXTRA_SPACE,
        height: SCROLL_TO_TOP_EXTRA_SPACE,
      }}
    >
      <button
        type="button"
        tabIndex={visible ? 0 : -1}
        aria-label={label || "Scroll to top"}
        onClick={onClick}
        className={cn(
          "focus-ring inline-flex h-11 min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-surface/95 text-foreground shadow-md backdrop-blur-xs text-sm font-medium transform-gpu transition-[width,translate,opacity,visibility] motion-feedback hover:bg-elevation-2 active:bg-elevation-3 dark:hover:bg-elevation-3 dark:active:bg-elevation-4 motion-reduce:transition-none",
          fullWidth ? "w-full px-4" : label ? "w-auto px-4" : "w-11 p-0",
          visible ? "pointer-events-auto opacity-100 translate-y-0 visible" : "pointer-events-none opacity-0 translate-y-2 invisible",
          options?.className,
        )}
      >
        <ArrowUp className="size-4 shrink-0" aria-hidden="true" />
        {label && <span>{label}</span>}
      </button>
    </div>
  );
}
