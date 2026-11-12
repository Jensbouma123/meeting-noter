import type { RefObject } from "react";
import { cn } from "@/lib/utils";
import { DataListArrowHint } from "@/components/ui/DataList/DataListArrowHint";
import type { DataListProps } from "@/components/ui/DataList/DataListProps";
import { DataListSkeletonItems } from "@/components/ui/DataList/DataListSkeletonItems";
import type { DataListView } from "@/components/ui/DataList/useDataListView";
import { defaultKeyExtractor } from "@/components/ui/DataList/utils";

interface DataListInfiniteListProps<T> {
  props: DataListProps<T>;
  view: DataListView<T>;
  sentinelRef: RefObject<HTMLDivElement | null>;
}

export function DataListInfiniteList<T>({ props, view, sentinelRef }: DataListInfiniteListProps<T>) {
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
    hasMore = false,
    isLoadingMore = false,
    skeletonCount = 3,
    renderSkeleton,
  } = props;

  return (
    /* INFINITE SCROLL MODE. Raw flex/grid for the same runtime reasons as the
       paginated container above. */
    <div
      role={view.resolvedContainerRole}
      aria-label={view.ariaLabel}
      aria-labelledby={view.ariaLabelledBy}
      aria-describedby={view.listHint.describedBy(view.ariaDescribedBy)}
      aria-busy={isLoadingMore || undefined}
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
      {view.processedItems.map((item, index) => {
        const key = getItemKey(item, index);
        const isSelected = view.selectedKeySet.has(key);
        const disabled = isItemDisabled ? isItemDisabled(item, index) : false;
        const active = index === view.activeIndex;

        return (
          <div
            key={key}
            id={view.getItemIdResolved(index)}
            data-index={index}
            data-active={active || undefined}
            role={view.resolvedItemRole}
            aria-selected={selectionMode !== "none" ? isSelected : undefined}
            aria-disabled={disabled || undefined}
            aria-setsize={hasMore ? -1 : view.processedItems.length}
            aria-posinset={index + 1}
            className={cn(
              "relative rounded-xl transition-all data-active:bg-primary-500/8 dark:data-active:bg-primary-400/15 hover:bg-primary-500/8 dark:hover:bg-primary-400/15",
              (selectionMode !== "none" || onItemClick) && !disabled && "cursor-pointer",
              active && "ring-2 ring-primary-500/50",
              isSelected && "bg-primary-500/10 dark:bg-primary-500/15",
              itemClassName,
            )}
            onClick={() => {
              if (disabled) return;
              if (selectionMode !== "none") view.handleToggleItemSelection(item, index);
              onItemClick?.(item, index);
            }}
          >
            {view.renderRowChrome(
              item,
              index,
              view.renderRow(item, {
                index,
                selected: isSelected,
                active,
                disabled,
              }),
              view.processedItems.length,
            )}
          </div>
        );
      })}

      {/* Skeletons while loading more */}
      {isLoadingMore && (
        <DataListSkeletonItems count={skeletonCount} layout={layout} renderSkeleton={renderSkeleton} />
      )}

      {/* Sentinel element for IntersectionObserver */}
      {hasMore && !isLoadingMore && (
        <div ref={sentinelRef} className="h-6 w-full opacity-0" aria-hidden="true" />
      )}

      {/* End of list state */}
      {!hasMore && view.processedItems.length > 0 && (
        <div className="col-span-full py-4 text-center text-xs text-muted-foreground border-t border-border/50">
          All {view.processedItems.length.toLocaleString()} items loaded
        </div>
      )}
      <DataListArrowHint hint={view.listHint} />
    </div>
  );
}
