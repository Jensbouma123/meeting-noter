"use client";

import { useRef } from "react";
import { ArrowHint } from "@/lib/ArrowHint";
import { cn } from "@/lib/utils";
import { ACTIVEDESCENDANT_ROLES } from "@/components/ui/VirtualList/constants";
import type { VirtualListProps } from "@/components/ui/VirtualList/types";
import { useVirtualListModel } from "@/components/ui/VirtualList/useVirtualListModel";
import { VirtualListRows, VirtualListScrollToTop } from "@/components/ui/VirtualList/VirtualListParts";

export function VirtualList<T>(props: VirtualListProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const {
    items,
    renderItem,
    dynamic = false,
    getItemKey,
    isItemSelected,
    onItemSelect,
    interactive = true,
    role = "list",
    itemRole = "listitem",
    label,
    labelledBy,
    describedBy,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
    "aria-describedby": ariaDescribedBy,
    className,
    itemClassName,
    itemStyle,
    emptyState,
  } = props;
  const model = useVirtualListModel(props, scrollRef);
  const { count, layout, range, hint } = model;

  return (
    <div
      ref={scrollRef}
      onScroll={model.handleScroll}
      onKeyDown={interactive ? model.handleKeyDown : undefined}
      {...hint.groupProps}
      // The root scrolls whatever `interactive` says, so it is always a tab stop:
      // SC 2.1.1 Keyboard needs a scroll container to be reachable and driveable
      // without a pointer, and arrow keys only scroll an element that can hold focus.
      // `interactive` still gates the active-descendant navigation layered on top.
      tabIndex={0}
      role={role}
      aria-label={ariaLabel ?? label}
      aria-labelledby={ariaLabelledBy ?? labelledBy}
      aria-describedby={hint.describedBy(ariaDescribedBy ?? describedBy)}
      aria-activedescendant={
        interactive && count > 0 && ACTIVEDESCENDANT_ROLES.has(role) ? model.itemId(model.resolvedActiveIndex) : undefined
      }
      className={cn("focus-ring relative overflow-y-auto overflow-x-hidden", className)}
      style={model.containerStyle}
    >
      {count === 0 ? (
        emptyState
      ) : (
        <div role="presentation" style={{ position: "relative", height: layout.total, width: "100%" }}>
          <VirtualListRows
            items={items}
            range={range}
            count={count}
            resolvedActiveIndex={model.resolvedActiveIndex}
            interactive={interactive}
            disabledAt={model.disabledAt}
            isItemSelected={isItemSelected}
            dynamic={dynamic}
            offsetAt={model.offsetAt}
            sizeAt={model.sizeAt}
            getItemKey={getItemKey}
            itemId={model.itemId}
            registerItem={model.registerItem}
            itemRole={itemRole}
            itemClassName={itemClassName}
            itemStyle={itemStyle}
            onItemSelect={onItemSelect}
            renderItem={renderItem}
          />
        </div>
      )}
      {hint.visible && (
        <div role="presentation" className="sticky bottom-0 h-0">
          <ArrowHint id={hint.id} text={hint.text} visible className="top-auto bottom-1 left-2" />
        </div>
      )}
      {model.scrollToTopEnabled && count > 0 && (
        <VirtualListScrollToTop
          options={model.scrollToTopOptions}
          visible={model.isScrollToTopVisible}
          fullWidth={model.isScrollToTopFullWidth}
          onClick={model.handleScrollToTop}
        />
      )}
    </div>
  );
}
