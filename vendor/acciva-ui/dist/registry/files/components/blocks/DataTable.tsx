"use client";

import { Search } from "lucide-react";
import { useCallback, useId, useMemo, type ReactNode } from "react";
import { Heading } from "@/components/ui/Heading/index";
import { HStack } from "@/components/ui/HStack";
import { Input } from "@/components/ui/Input/index";
import { Stack } from "@/components/ui/Stack/index";
import { Text } from "@/components/ui/Text";
import { VirtualList } from "@/components/ui/VirtualList/index";
import { VStack } from "@/components/ui/VStack";
import { CARD_BREAKPOINT, DEFAULT_CARD_HEIGHT, DEFAULT_HEIGHT, DEFAULT_ROW_HEIGHT } from "@/components/blocks/dataTableConstants";
import { renderDataTableCard } from "@/components/blocks/dataTableParts";
import { DataTableWide } from "@/components/blocks/dataTableWide";
import type { DataTableProps } from "@/components/blocks/dataTableTypes";
import { useDataTableLayout } from "@/components/blocks/useDataTableLayout";
import { useDataTableRows } from "@/components/blocks/useDataTableRows";
import { useIsWideViewport } from "@/components/blocks/useIsWideViewport";

export type { ColumnAlign, DataTableColumn, DataTableProps, DataTableSort, SortDirection } from "@/components/blocks/dataTableTypes";

export function DataTable<T>({
  data,
  columns,
  getRowId,
  caption,
  height = DEFAULT_HEIGHT,
  rowHeight = DEFAULT_ROW_HEIGHT,
  autoRowHeight = false,
  estimatedCardHeight = DEFAULT_CARD_HEIGHT,
  searchable = true,
  searchPlaceholder = "Search table…",
  initialSort,
  onRowClick,
  emptyMessage = "No matching rows",
  toolbar,
  className,
}: DataTableProps<T>) {
  const { query, setQuery, sort, rows, toggleSort } = useDataTableRows(data, columns, initialSort);
  const wide = useIsWideViewport(CARD_BREAKPOINT);
  const baseId = useId();
  const { gridTemplate, tableMinWidth, cardColumns, primaryColumn } = useDataTableLayout(columns);

  const statusId = `${baseId}-status`;
  const listLabelId = `${baseId}-caption`;

  const emptyState = (
    <Text as="p" size="sm" variant="muted" align="center" className="flex h-full items-center justify-center px-4">
      {emptyMessage}
    </Text>
  );

  const renderCard = useCallback(
    (row: T) => renderDataTableCard(row, cardColumns, primaryColumn),
    [cardColumns, primaryColumn],
  );

  return (
    <VStack as="section" spacing="md" className={className} aria-labelledby={listLabelId}>
      <Stack direction={{ base: "vertical", sm: "horizontal" }} spacing="md" justify="between">
        <Heading level={2} size="md" weight="semibold" id={listLabelId}>
          {caption}
        </Heading>
        <HStack spacing="sm" className="w-full sm:w-72">
          {toolbar}
          {searchable ? (
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              leadingIcon={<Search />}
              aria-label={`Search ${caption}`}
              aria-describedby={statusId}
            />
          ) : null}
        </HStack>
      </Stack>

      <Text as="p" id={statusId} role="status" aria-live="polite" size="xs" variant="muted">
        {rows.length} of {data.length} rows
      </Text>

      {wide ? (
        <DataTableWide
          caption={caption}
          columns={columns}
          rows={rows}
          getRowId={getRowId}
          gridTemplate={gridTemplate}
          tableMinWidth={tableMinWidth}
          sort={sort}
          toggleSort={toggleSort}
          rowHeight={rowHeight}
          autoRowHeight={autoRowHeight}
          height={height}
          onRowClick={onRowClick}
          emptyState={emptyState}
        />
      ) : (
        <VirtualList
          items={rows}
          itemHeight={estimatedCardHeight}
          dynamic
          height={height}
          role="list"
          itemRole="listitem"
          interactive={Boolean(onRowClick)}
          label={caption}
          getItemKey={getRowId}
          onItemSelect={onRowClick}
          renderItem={renderCard}
          emptyState={emptyState}
          itemClassName={onRowClick ? "cursor-pointer" : undefined}
        />
      )}
    </VStack>
  );
}
