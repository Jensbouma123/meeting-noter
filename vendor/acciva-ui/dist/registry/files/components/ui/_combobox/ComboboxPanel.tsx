import { useEffect, useRef, type CSSProperties, type ReactNode, type RefObject } from "react";
import { VirtualList, type VirtualListHandle, type VirtualListItemState } from "@/components/ui/VirtualList/index";
import { useOpenSide } from "@/components/ui/Select/useOpenSide";
import { anchorNameFor } from "@/components/ui/_combobox/parts";
import type { ComboboxItem } from "@/components/ui/_combobox/types";

interface ComboboxPanelProps<T extends ComboboxItem> {
  items: readonly T[];
  selectedValue?: string | null;
  optionHeight: number;
  maxListHeight: number;
  listRef: RefObject<VirtualListHandle | null>;
  listboxId: string;
  /** Id of the element naming the listbox; `listLabel` is the fallback text. */
  labelId?: string;
  listLabel?: string;
  optionId: (index: number) => string;
  emptyMessage: string;
  onCommit: (index: number) => void;
  renderRow: (item: T, state: VirtualListItemState) => ReactNode;
}

/**
 * The popup shared by SearchableSelect and SearchCombobox: a `popover="manual"` top-layer panel
 * (`.select-list`) anchored to the field, holding a virtualized listbox. Focus stays on the input.
 */
export function ComboboxPanel<T extends ComboboxItem>({
  items,
  selectedValue = null,
  optionHeight,
  maxListHeight,
  listRef,
  listboxId,
  labelId,
  listLabel,
  optionId,
  emptyMessage,
  onCommit,
  renderRow,
}: ComboboxPanelProps<T>) {
  const listHeight = Math.min(maxListHeight, Math.max(optionHeight, items.length * optionHeight));
  const panelRef = useRef<HTMLDivElement>(null);
  useOpenSide(panelRef);

  // Top layer: no `overflow: hidden` ancestor clips it, and `.select-list` bounds it to the side it
  // opened. The list shrinks (flex) to that bound, so a short viewport never pushes it off-screen.
  useEffect(() => {
    const panel = panelRef.current;
    if (panel?.showPopover && !panel.matches(":popover-open")) panel.showPopover();
  }, []);

  return (
    <div
      ref={panelRef}
      popover="manual"
      // Option clicks must not blur the input, or commit()'s refocus reopens the list.
      onMouseDown={(event) => event.preventDefault()}
      style={{ positionAnchor: anchorNameFor(listboxId), width: "anchor-size(width)", "--select-list-cap": "100%" } as CSSProperties}
      className="select-list flex flex-col overflow-hidden rounded-lg border border-border bg-surface p-1 shadow-lg animate-fade-in"
    >
      <VirtualList
        items={items}
        itemHeight={optionHeight}
        height={listHeight}
        listRef={listRef}
        role="listbox"
        itemRole="option"
        interactive={false}
        aria-labelledby={labelId}
        aria-label={labelId ? undefined : listLabel}
        getItemKey={(option) => option.value}
        getItemId={optionId}
        isItemDisabled={(option) => Boolean(option.disabled)}
        isItemSelected={(option) => option.value === selectedValue}
        onItemSelect={(_, index) => onCommit(index)}
        className="focus:outline-none"
        emptyState={
          <p className="flex h-full items-center justify-center px-3 text-sm text-muted-foreground">{emptyMessage}</p>
        }
        renderItem={renderRow}
      />
    </div>
  );
}
