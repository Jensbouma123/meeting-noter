import { ChevronDown, X } from "lucide-react";
import type { CSSProperties, KeyboardEvent, ReactNode, RefObject } from "react";
import { cn } from "@/lib/utils";
import type { SearchableSelectOption } from "@/components/ui/SearchableSelect/types";

/** The trigger's `anchor-name`, which the top-layer panel positions against. */
export const anchorNameFor = (listboxId: string) => `--ss-${listboxId.replace(/[^\w-]/g, "")}`;

export function OptionAdornment({ icon }: { icon: ReactNode }) {
  if (!icon) return null;
  return (
    <span aria-hidden="true" className="flex size-4 shrink-0 items-center justify-center text-muted-foreground">
      {icon}
    </span>
  );
}

interface SearchableSelectTriggerProps {
  inputId: string;
  inputRef: RefObject<HTMLInputElement | null>;
  labelId: string | undefined;
  listboxId: string;
  statusId: string;
  activeId: string | undefined;
  disabled: boolean;
  open: boolean;
  query: string;
  placeholder: string;
  selected: SearchableSelectOption | null;
  clearable: boolean;
  onInputChange: (value: string) => void;
  onFocus: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onToggle: () => void;
  onClear: () => void;
}

export function SearchableSelectTrigger({
  inputId,
  inputRef,
  labelId,
  listboxId,
  statusId,
  activeId,
  disabled,
  open,
  query,
  placeholder,
  selected,
  clearable,
  onInputChange,
  onFocus,
  onKeyDown,
  onToggle,
  onClear,
}: SearchableSelectTriggerProps) {
  return (
    <div
      style={{ anchorName: anchorNameFor(listboxId) } as CSSProperties}
      className={cn(
        "flex h-10 w-full items-center gap-1 rounded-lg border border-border bg-background pl-3 pr-1 transition-colors motion-feedback",
        "focus-within:border-primary-500 hover:border-muted-foreground/60 active:border-foreground",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <OptionAdornment icon={selected?.icon} />

      <input
        ref={inputRef}
        id={inputId}
        type="text"
        role="combobox"
        autoComplete="off"
        spellCheck={false}
        disabled={disabled}
        value={open ? query : (selected?.label ?? "")}
        placeholder={selected ? selected.label : placeholder}
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-labelledby={labelId}
        aria-describedby={statusId}
        aria-activedescendant={activeId}
        onChange={(event) => onInputChange(event.target.value)}
        onFocus={onFocus}
        onKeyDown={onKeyDown}
        className="focus-ring h-full min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
      />

      {clearable && selected && !disabled ? (
        <button
          type="button"
          aria-label={`Clear ${selected.label}`}
          onClick={onClear}
          className="touch-target-44 focus-ring flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors motion-feedback hover:bg-elevation-2 hover:text-foreground active:bg-elevation-3 active:text-foreground active:scale-99 dark:hover:bg-elevation-3 dark:active:bg-elevation-4"
        >
          <X className="size-4" />
        </button>
      ) : null}

      <button
        type="button"
        tabIndex={-1}
        aria-hidden
        disabled={disabled}
        onClick={onToggle}
        className="touch-target-44 flex size-7 items-center justify-center rounded-md text-muted-foreground"
      >
        <ChevronDown className={cn("size-4 transition-transform motion-feedback", open && "rotate-180")} />
      </button>
    </div>
  );
}
