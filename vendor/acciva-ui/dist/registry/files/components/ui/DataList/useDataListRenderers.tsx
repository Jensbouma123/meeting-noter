import { useCallback, type ReactNode } from "react";
import type { DataListProps } from "@/components/ui/DataList/DataListProps";
import { DataListRowChrome } from "@/components/ui/DataList/DataListRowChrome";
import { DataListRowContent } from "@/components/ui/DataList/DataListRowContent";
import type { DataListItemState } from "@/components/ui/DataList/types";

export function useDataListRenderers<T>(
  props: DataListProps<T>,
  handleReorderMove: (from: number, to: number) => void,
) {
  const { tableColumns, renderItem, rowActions, rowActionsLabel = "Row actions", onReorder, isItemDisabled } = props;

  const columnTemplate = tableColumns ? `repeat(${tableColumns.length}, minmax(0, 1fr))` : undefined;

  const renderRow = useCallback(
    (item: T, state: DataListItemState): ReactNode => {
      if (!tableColumns) return renderItem?.(item, state) ?? null;
      return <DataListRowContent columns={tableColumns} template={columnTemplate} item={item} index={state.index} />;
    },
    [tableColumns, renderItem, columnTemplate],
  );

  // Row chrome: content plus the trailing overflow-menu trigger. The trigger is a
  // real tab stop (SC 2.1.1) and an icon-only Button, so its 44px coarse-pointer
  // target (SC 2.5.8) and accessible name (SC 4.1.2) come from Button. Opening the
  // menu never bubbles into the row's own click (selection / onItemClick).
  const renderRowChrome = useCallback(
    (item: T, index: number, content: ReactNode, total: number): ReactNode => {
      const actions = rowActions ? rowActions(item, index) : [];
      const canReorder = onReorder !== undefined && total > 1;
      if (actions.length === 0 && !canReorder) return content;
      const disabled = isItemDisabled ? isItemDisabled(item, index) : false;
      if (disabled) return content;

      return (
        <DataListRowChrome
          item={item}
          index={index}
          total={total}
          content={content}
          actions={actions}
          canReorder={canReorder}
          label={rowActionsLabel}
          onMove={handleReorderMove}
        />
      );
    },
    [rowActions, rowActionsLabel, onReorder, isItemDisabled, handleReorderMove],
  );

  return { columnTemplate, renderRow, renderRowChrome };
}
