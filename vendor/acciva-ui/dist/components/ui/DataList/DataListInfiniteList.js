import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { cn } from "../../../lib/utils.js";
import { DataListArrowHint } from "./DataListArrowHint.js";
import { DataListSkeletonItems } from "./DataListSkeletonItems.js";
import { defaultKeyExtractor } from "./utils.js";
export function DataListInfiniteList({ props, view, sentinelRef }) {
    const { layout = "list", gap = 16, interactive = true, selectionMode = "none", getItemKey = defaultKeyExtractor, isItemDisabled, onItemClick, listClassName, itemClassName, hasMore = false, isLoadingMore = false, skeletonCount = 3, renderSkeleton, } = props;
    return (
    /* INFINITE SCROLL MODE. Raw flex/grid for the same runtime reasons as the
       paginated container above. */
    _jsxs("div", { role: view.resolvedContainerRole, "aria-label": view.ariaLabel, "aria-labelledby": view.ariaLabelledBy, "aria-describedby": view.listHint.describedBy(view.ariaDescribedBy), "aria-busy": isLoadingMore || undefined, "aria-multiselectable": selectionMode === "multiple" || undefined, tabIndex: interactive ? 0 : undefined, onKeyDown: view.handleContainerKeyDown, ...view.listHint.groupProps, className: cn("focus-ring relative", layout === "grid"
            ? "grid gap-4"
            : "flex flex-col gap-2.5", listClassName), style: layout === "grid"
            ? {
                gridTemplateColumns: `repeat(${view.activeColumns}, minmax(0, 1fr))`,
                gap: typeof gap === "number" ? `${gap}px` : gap,
            }
            : undefined, children: [view.processedItems.map((item, index) => {
                const key = getItemKey(item, index);
                const isSelected = view.selectedKeySet.has(key);
                const disabled = isItemDisabled ? isItemDisabled(item, index) : false;
                const active = index === view.activeIndex;
                return (_jsx("div", { id: view.getItemIdResolved(index), "data-index": index, "data-active": active || undefined, role: view.resolvedItemRole, "aria-selected": selectionMode !== "none" ? isSelected : undefined, "aria-disabled": disabled || undefined, "aria-setsize": hasMore ? -1 : view.processedItems.length, "aria-posinset": index + 1, className: cn("relative rounded-xl transition-all data-active:bg-primary-500/8 dark:data-active:bg-primary-400/15 hover:bg-primary-500/8 dark:hover:bg-primary-400/15", (selectionMode !== "none" || onItemClick) && !disabled && "cursor-pointer", active && "ring-2 ring-primary-500/50", isSelected && "bg-primary-500/10 dark:bg-primary-500/15", itemClassName), onClick: () => {
                        if (disabled)
                            return;
                        if (selectionMode !== "none")
                            view.handleToggleItemSelection(item, index);
                        onItemClick?.(item, index);
                    }, children: view.renderRowChrome(item, index, view.renderRow(item, {
                        index,
                        selected: isSelected,
                        active,
                        disabled,
                    }), view.processedItems.length) }, key));
            }), isLoadingMore && (_jsx(DataListSkeletonItems, { count: skeletonCount, layout: layout, renderSkeleton: renderSkeleton })), hasMore && !isLoadingMore && (_jsx("div", { ref: sentinelRef, className: "h-6 w-full opacity-0", "aria-hidden": "true" })), !hasMore && view.processedItems.length > 0 && (_jsxs("div", { className: "col-span-full py-4 text-center text-xs text-muted-foreground border-t border-border/50", children: ["All ", view.processedItems.length.toLocaleString(), " items loaded"] })), _jsx(DataListArrowHint, { hint: view.listHint })] }));
}
