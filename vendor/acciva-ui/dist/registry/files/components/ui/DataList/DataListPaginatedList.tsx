import { cn } from "@/lib/utils";
import { DataListArrowHint } from "@/components/ui/DataList/DataListArrowHint";
import type { DataListProps } from "@/components/ui/DataList/DataListProps";
import type { DataListView } from "@/components/ui/DataList/useDataListView";
import { defaultKeyExtractor } from "@/components/ui/DataList/utils";

interface DataListPaginatedListProps<T> {
  props: DataListProps<T>;
  view: DataListView<T>;
}

export function DataListPaginatedList<T>({ props, view }: DataListPaginatedListProps<T>) {
  const {
    layout = "list",
    gap = 16,
    interactive = true,
    selectionMode = "none",
    getItemKey = defaultKeyExtractor,
    isItemDisabled,
    onItemClick,
    listClassName,
    itemClassName,
  } = props;

  return (
    /* PAGINATED MODE. Raw flex/grid: `layout` flips display at runtime, the grid
       template comes from `activeColumns`, and the list gap is a half step. */
    <div
      role={view.resolvedContainerRole}
      aria-label={view.ariaLabel}
      aria-labelledby={view.ariaLabelledBy}
      aria-describedby={view.listHint.describedBy(view.ariaDescribedBy)}
      aria-multiselectable={selectionMode === "multiple" || undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={view.handleContainerKeyDown}
      {...view.listHint.groupProps}
      className={cn(
        "focus-ring relative",
        layout === "grid"
          ? "grid gap-4"
          : "flex flex-col gap-2.5",
        listClassName,
      )}
      style={
        layout === "grid"
          ? {
              gridTemplateColumns: `repeat(${view.activeColumns}, minmax(0, 1fr))`,
              gap: typeof gap === "number" ? `${gap}px` : gap,
            }
          : undefined
      }
    >
      {view.paginatedItems.map((item, localIdx) => {
        const globalIndex = (view.currentPage - 1) * view.activePageSize + localIdx;
        const key = getItemKey(item, globalIndex);
        const isSelected = view.selectedKeySet.has(key);
        const disabled = isItemDisabled ? isItemDisabled(item, globalIndex) : false;
        const active = globalIndex === view.activeIndex;

        return (
          <div
            key={key}
            id={view.getItemIdResolved(globalIndex)}
            data-index={globalIndex}
            data-active={active || undefined}
            role={view.resolvedItemRole}
            aria-selected={selectionMode !== "none" ? isSelected : undefined}
            aria-disabled={disabled || undefined}
            aria-setsize={view.totalItems}
            aria-posinset={globalIndex + 1}
            className={cn(
              "relative rounded-xl transition-all data-active:bg-primary-500/8 dark:data-active:bg-primary-400/15 hover:bg-primary-500/8 dark:hover:bg-primary-400/15",
              (selectionMode !== "none" || onItemClick) && !disabled && "cursor-pointer",
              active && "ring-2 ring-primary-500/50",
              isSelected && "bg-primary-500/10 dark:bg-primary-500/15",
              itemClassName,
            )}
            onClick={() => {
              if (disabled) return;
              if (selectionMode !== "none") view.handleToggleItemSelection(item, globalIndex);
              onItemClick?.(item, globalIndex);
            }}
          >
            {view.renderRowChrome(
              item,
              globalIndex,
              view.renderRow(item, {
                index: globalIndex,
                selected: isSelected,
                active,
                disabled,
              }),
              view.totalItems,
            )}
          </div>
        );
      })}
      <DataListArrowHint hint={view.listHint} />
    </div>
  );
}
