import { HStack } from "@/components/ui/HStack";
import type { DataListProps } from "@/components/ui/DataList/DataListProps";
import { DataListSearchField } from "@/components/ui/DataList/DataListSearchField";
import { DataListSelectionBar } from "@/components/ui/DataList/DataListSelectionBar";
import { DataListSortControl } from "@/components/ui/DataList/DataListSortControl";
import type { DataListView } from "@/components/ui/DataList/useDataListView";

interface DataListToolbarProps<T> {
  props: DataListProps<T>;
  view: DataListView<T>;
}

export function DataListToolbar<T>({ props, view }: DataListToolbarProps<T>) {
  const {
    searchable = false,
    sortable = false,
    sortOptions,
    toolbar,
    selectionMode = "none",
    showSelectionToolbar = true,
    searchPlaceholder = "Search list...",
  } = props;

  return (
    <HStack spacing="md" wrap justify="between">
      <div className="flex flex-1 flex-wrap items-center gap-3 min-w-60">
        {searchable && (
          <DataListSearchField
            inputId={view.searchInputId}
            query={view.activeSearchQuery}
            placeholder={searchPlaceholder}
            statusRegionId={view.statusRegionId}
            onQueryChange={view.handleSearchChange}
          />
        )}

        {sortable && sortOptions && sortOptions.length > 0 && (
          <DataListSortControl
            id={`${view.generatedId}-sort`}
            options={sortOptions}
            activeKey={view.activeSortKey}
            direction={view.activeSortDirection}
            onSortChange={view.handleSortChange}
            onToggleDirection={view.toggleSortDirection}
          />
        )}

        {toolbar}
      </div>

      {/* Selection Toolbar */}
      {selectionMode === "multiple" && showSelectionToolbar && (
        <DataListSelectionBar
          selectedCount={view.selectedCount}
          itemCount={view.processedItems.length}
          onSelectAll={view.handleSelectAll}
          onClear={view.handleClearSelection}
        />
      )}
    </HStack>
  );
}
