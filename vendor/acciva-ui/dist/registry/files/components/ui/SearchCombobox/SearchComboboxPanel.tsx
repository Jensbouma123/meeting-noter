import { CornerDownLeft } from "lucide-react";
import type { RefObject } from "react";
import type { VirtualListHandle } from "@/components/ui/VirtualList/index";
import { cn } from "@/lib/utils";
import { ComboboxPanel } from "@/components/ui/_combobox/ComboboxPanel";
import { OptionAdornment, highlightMatch } from "@/components/ui/_combobox/parts";
import { HStack } from "@/components/ui/HStack";
import type { SearchComboboxOption } from "@/components/ui/SearchCombobox/types";

interface SearchComboboxPanelProps {
  items: readonly SearchComboboxOption[];
  query: string;
  activeIndex: number;
  optionHeight: number;
  maxListHeight: number;
  listRef: RefObject<VirtualListHandle | null>;
  listboxId: string;
  listLabel: string | undefined;
  optionId: (index: number) => string;
  emptyMessage: string;
  onCommit: (index: number) => void;
  onHover: (index: number) => void;
}

export function SearchComboboxPanel({ query, activeIndex, onHover, ...panel }: SearchComboboxPanelProps) {
  return (
    <ComboboxPanel
      {...panel}
      renderRow={(option, state) => (
        <HStack
          justify="between"
          spacing="sm"
          className={cn(
            "h-full rounded-md px-3 text-sm transition-colors motion-feedback",
            state.index === activeIndex && !option.disabled
              ? "bg-primary-500/15 text-primary-950 dark:bg-primary-400/25 dark:text-primary-50 active:bg-primary-500/25"
              : "text-foreground hover:bg-elevation-2 active:bg-elevation-3 dark:hover:bg-elevation-3 dark:active:bg-elevation-4",
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
          {state.index === activeIndex && !option.disabled ? (
            <CornerDownLeft aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
          ) : null}
        </HStack>
      )}
    />
  );
}
