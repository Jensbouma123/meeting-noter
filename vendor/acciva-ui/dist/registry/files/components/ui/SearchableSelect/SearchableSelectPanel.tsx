import { Check } from "lucide-react";
import { useEffect, useRef, type CSSProperties, type ReactNode, type RefObject } from "react";
import { VirtualList, type VirtualListHandle } from "@/components/ui/VirtualList/index";
import { cn } from "@/lib/utils";
import { HStack } from "@/components/ui/HStack";
import { OptionAdornment, anchorNameFor } from "@/components/ui/SearchableSelect/SearchableSelectParts";
import type { SearchableSelectOption } from "@/components/ui/SearchableSelect/types";

function highlightMatch(label: string, query: string): ReactNode {
  if (!query) return label;
  const start = label.toLowerCase().indexOf(query);
  if (start === -1) return label;
  const end = start + query.length;
  return (
    <>
      {label.slice(0, start)}
      <mark className="bg-primary-500/15 text-primary-900 dark:bg-primary-400/25 dark:text-primary-200 rounded-xs px-0.5 font-semibold">
        {label.slice(start, end)}
      </mark>
      {label.slice(end)}
    </>
  );
}

interface SearchableSelectPanelProps {
  items: readonly SearchableSelectOption[];
  value: string | null;
  query: string;
  activeIndex: number;
  optionHeight: number;
  maxListHeight: number;
  listRef: RefObject<VirtualListHandle | null>;
  listboxId: string;
  labelId: string | undefined;
  optionId: (index: number) => string;
  emptyMessage: string;
  onCommit: (index: number) => void;
  onHover: (index: number) => void;
}

export function SearchableSelectPanel({
  items,
  value,
  query,
  activeIndex,
  optionHeight,
  maxListHeight,
  listRef,
  listboxId,
  labelId,
  optionId,
  emptyMessage,
  onCommit,
  onHover,
}: SearchableSelectPanelProps) {
  const listHeight = Math.min(maxListHeight, Math.max(optionHeight, items.length * optionHeight));
  const panelRef = useRef<HTMLDivElement>(null);

  // Top layer, like Select: no `overflow: hidden` ancestor clips it, and `.select-list` bounds it to
  // the side it opened. Focus stays on the input (`manual`); the list shrinks (flex) to that bound.
  useEffect(() => {
    const panel = panelRef.current;
    if (panel?.showPopover && !panel.matches(":popover-open")) panel.showPopover();
  }, []);

  return (
    <div
      ref={panelRef}
      popover="manual"
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
        labelledBy={labelId}
        getItemKey={(option) => option.value}
        getItemId={optionId}
        isItemDisabled={(option) => Boolean(option.disabled)}
        isItemSelected={(option) => option.value === value}
        onItemSelect={(_, index) => onCommit(index)}
        className="focus:outline-none"
        emptyState={
          <p className="flex h-full items-center justify-center px-3 text-sm text-muted-foreground">{emptyMessage}</p>
        }
        renderItem={(option, state) => (
          <HStack
            justify="between"
            spacing="sm"
            className={cn(
              "h-full rounded-md px-3 text-sm transition-colors motion-feedback",
              option.value === value && "bg-primary-500/10 font-semibold text-primary-950 dark:bg-primary-400/15 dark:text-primary-100 active:bg-primary-500/20",
              state.index === activeIndex && !option.disabled && "bg-primary-500/15 text-primary-950 dark:bg-primary-400/25 dark:text-primary-50 active:bg-primary-500/25",
              option.value !== value && state.index !== activeIndex && "text-foreground hover:bg-elevation-2 active:bg-elevation-3 dark:hover:bg-elevation-3 dark:active:bg-elevation-4",
              state.disabled ? "cursor-not-allowed opacity-60 hover:bg-transparent dark:hover:bg-transparent" : "cursor-pointer",
            )}
            onMouseEnter={() => {
              if (!state.disabled) onHover(state.index);
            }}
          >
            <HStack as="span" spacing="sm" className="min-w-0">
              <OptionAdornment icon={option.icon} />
              <span className="truncate">{highlightMatch(option.label, query)}</span>
            </HStack>
            {state.selected ? <Check className="size-4 shrink-0 text-primary-600 dark:text-primary-400" /> : null}
          </HStack>
        )}
      />
    </div>
  );
}
