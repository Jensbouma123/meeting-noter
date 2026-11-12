"use client";

import { useState } from "react";
import { DataTable } from "@/components/blocks/DataTable";
import { DEFAULT_HEIGHT } from "@/components/blocks/dataTableConstants";
import { Card } from "@/components/ui/Card/index";
import { EmptyState } from "@/components/ui/EmptyState";
import { Text } from "@/components/ui/Text";
import { VirtualList } from "@/components/ui/VirtualList/index";
import { VStack } from "@/components/ui/VStack";
import { cn } from "@/lib/utils";
import { ListDetailDrawer } from "@/components/blocks/ListDetailView/ListDetailViewDrawer";
import type { ListDetailViewProps } from "@/components/blocks/ListDetailView/ListDetailViewTypes";

export type { ListDetailViewProps } from "@/components/blocks/ListDetailView/ListDetailViewTypes";

export function ListDetailView<T>({
  items,
  mode = "table",
  columns = [],
  renderListItem,
  getItemKey,
  caption,
  selectedItem,
  onSelectItem,
  renderDetail,
  detailTitle,
  searchable,
  searchPlaceholder,
  height,
  rowHeight = 60,
  emptyMessage,
  toolbar,
  className,
  arrowHint,
}: ListDetailViewProps<T>) {
  const [internalSelected, setInternalSelected] = useState<T | null>(null);
  const isControlled = selectedItem !== undefined;
  const currentItem = isControlled ? selectedItem : internalSelected;

  const handleSelect = (item: T | null) => {
    if (onSelectItem) {
      onSelectItem(item);
    }
    if (!isControlled) {
      setInternalSelected(item);
    }
  };

  const isSelectedItem = (item: T, index: number) =>
    currentItem !== null && currentItem !== undefined && getItemKey(currentItem, -1) === getItemKey(item, index);

  const isTableMode = mode === "table" && columns.length > 0;

  return (
    <VStack spacing="md" className={cn("w-full", className)}>
      {isTableMode ? (
        <DataTable
          data={items}
          columns={columns}
          getRowId={getItemKey}
          caption={caption}
          height={height}
          searchable={searchable}
          searchPlaceholder={searchPlaceholder}
          onRowClick={(row) => handleSelect(row)}
          emptyMessage={emptyMessage}
          toolbar={toolbar}
        />
      ) : (
        <VStack spacing="sm" className="w-full">
          {toolbar}
          {items.length === 0 ? (
            <Card padding="lg">
              <EmptyState title={emptyMessage ?? "No items found"} size="sm" />
            </Card>
          ) : (
            <Card padding="none">
              <VirtualList
                items={items}
                height={height ?? DEFAULT_HEIGHT}
                itemHeight={rowHeight}
                getItemKey={getItemKey}
                aria-label={caption}
                arrowHint={arrowHint}
                role="listbox"
                itemRole="option"
                itemClassName="data-[active]:bg-elevation-2"
                isItemSelected={(item, index) => isSelectedItem(item, index)}
                onItemSelect={(item) => handleSelect(item)}
                renderItem={(item, state) => {
                  const isSelected = state.selected;

                  return (
                    <div
                      key={getItemKey(item, state.index)}
                      className={cn(
                        "cursor-pointer border-b border-border transition-colors motion-feedback last:border-b-0",
                        isSelected ? "bg-primary-500/10 active:bg-primary-500/15" : "hover:bg-elevation-2 active:bg-elevation-3",
                      )}
                    >
                      {renderListItem ? (
                        renderListItem(item, state.index, isSelected)
                      ) : (
                        <div className="p-4">
                          <Text>{String(getItemKey(item, state.index))}</Text>
                        </div>
                      )}
                    </div>
                  );
                }}
              />
            </Card>
          )}
        </VStack>
      )}

      <ListDetailDrawer
        currentItem={currentItem}
        detailTitle={detailTitle}
        renderDetail={renderDetail}
        onClose={() => handleSelect(null)}
      />
    </VStack>
  );
}
