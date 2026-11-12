import { Check } from "lucide-react";
import { useEffect, type CSSProperties, type Dispatch, type MouseEvent as ReactMouseEvent, type RefObject, type SetStateAction } from "react";
import { cn } from "@/lib/utils";
import { HStack } from "@/components/ui/HStack";
import type { SelectOption } from "@/components/ui/Select/types";

interface SelectListboxProps {
  listRef: RefObject<HTMLUListElement | null>;
  listId: string;
  baseId: string;
  anchorName: string;
  options: SelectOption[];
  value: string | null;
  activeIndex: number;
  ariaLabel?: string;
  labelledBy?: string;
  onCommit: (index: number) => void;
  onActivate: Dispatch<SetStateAction<number>>;
}

function handleListMouseDown(event: ReactMouseEvent<HTMLUListElement>) {
  event.preventDefault();
}

export function SelectListbox({
  listRef,
  listId,
  baseId,
  anchorName,
  options,
  value,
  activeIndex,
  ariaLabel,
  labelledBy,
  onCommit,
  onActivate,
}: SelectListboxProps) {
  // Top layer escapes any `overflow: hidden` ancestor; `manual` leaves outside-press and Escape to
  // Select (it keeps focus on the trigger), and anchor positioning tracks the trigger without measuring.
  useEffect(() => {
    const list = listRef.current;
    if (list?.showPopover && !list.matches(":popover-open")) list.showPopover();
  }, [listRef]);

  return (
    <ul
      ref={listRef}
      id={listId}
      role="listbox"
      aria-label={ariaLabel}
      aria-labelledby={labelledBy}
      popover="manual"
      onMouseDown={handleListMouseDown}
      style={{ positionAnchor: anchorName, minWidth: "anchor-size(width)" } as CSSProperties}
      className={cn(
        "select-list rounded-lg border border-border bg-surface p-1 text-foreground shadow-lg animate-fade-in",
      )}
    >
      {options.map((option, index) => (
        <HStack
          as="li"
          key={option.value}
          id={`${baseId}-option-${index}`}
          data-index={index}
          role="option"
          justify="between"
          spacing="none"
          aria-selected={option.value === value}
          aria-disabled={option.disabled}
          onMouseEnter={() => onActivate(index)}
          onClick={() => onCommit(index)}
          className={cn(
            "cursor-pointer rounded-md px-3 py-2 text-sm transition-colors",
            option.value === value && "bg-primary-500/10 font-semibold text-primary-950 dark:bg-primary-400/15 dark:text-primary-100",
            index === activeIndex && !option.disabled && "bg-primary-500/15 text-primary-950 dark:bg-primary-400/25 dark:text-primary-50",
            option.value !== value && index !== activeIndex && "text-foreground hover:bg-elevation-2 active:bg-elevation-3 dark:hover:bg-elevation-3 dark:active:bg-elevation-4",
            option.disabled && "cursor-not-allowed opacity-60 hover:bg-transparent dark:hover:bg-transparent",
          )}
        >
          <span>{option.label}</span>
          {option.value === value ? (
            <Check className="size-4 shrink-0 text-primary-600 dark:text-primary-400" />
          ) : null}
        </HStack>
      ))}
    </ul>
  );
}
