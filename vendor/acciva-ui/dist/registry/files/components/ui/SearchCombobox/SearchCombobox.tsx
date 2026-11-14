"use client";

import { useCallback, useDeferredValue, useEffect, useId, useMemo, useRef, useState, type CSSProperties } from "react";
import type { VirtualListHandle } from "@/components/ui/VirtualList/index";
import { cn } from "@/lib/utils";
import { anchorNameFor } from "@/components/ui/_combobox/parts";
import { useActiveIndex } from "@/components/ui/_combobox/useActiveIndex";
import { useComboboxKeyDown } from "@/components/ui/_combobox/useComboboxKeyDown";
import { useDismissOnPointerDown } from "@/components/ui/_combobox/useDismissOnPointerDown";
import { Input } from "@/components/ui/Input/index";
import { DEFAULT_MAX_LIST_HEIGHT, DEFAULT_OPTION_HEIGHT, defaultFilter } from "@/components/ui/SearchCombobox/defaults";
import { SearchComboboxPanel } from "@/components/ui/SearchCombobox/SearchComboboxPanel";
import type { SearchComboboxProps } from "@/components/ui/SearchCombobox/types";

const navigate = (href: string) => window.location.assign(href);

/** Search-and-go combobox: type to filter, Enter/click follows a link option or runs an action. No committed value. */
export function SearchCombobox({
  id,
  options,
  label,
  "aria-label": ariaLabel,
  placeholder = "Search…",
  emptyMessage = "No results",
  disabled = false,
  onNavigate = navigate,
  optionHeight = DEFAULT_OPTION_HEIGHT,
  maxListHeight = DEFAULT_MAX_LIST_HEIGHT,
  filter = defaultFilter,
  className,
}: SearchComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listHandle = useRef<VirtualListHandle>(null);
  const baseId = useId();
  const inputId = id ?? `${baseId}-input`;
  const listboxId = `${baseId}-listbox`;
  const statusId = `${baseId}-status`;
  const optionId = useCallback((index: number) => `${baseId}-option-${index}`, [baseId]);

  const normalizedQuery = deferredQuery.trim().toLowerCase();
  const results = useMemo(
    () => (normalizedQuery ? options.filter((option) => filter(option, normalizedQuery)) : options),
    [options, normalizedQuery, filter],
  );

  const [activeIndex, setActiveIndex, moveActive] = useActiveIndex(open, results, null);
  useDismissOnPointerDown(open, containerRef, setOpen);

  useEffect(() => {
    if (open) listHandle.current?.scrollToIndex(activeIndex);
  }, [open, activeIndex]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);

  const commit = useCallback(
    (index: number) => {
      const option = results[index];
      if (!option || option.disabled) return;
      close();
      if (option.href) onNavigate(option.href);
      else {
        option.onSelect?.();
        inputRef.current?.focus({ preventScroll: true });
      }
    },
    [results, close, onNavigate],
  );

  const handleKeyDown = useComboboxKeyDown(
    disabled, open, setOpen, results, activeIndex, setActiveIndex, moveActive, commit, close,
  );

  return (
    <div
      ref={containerRef}
      style={{ anchorName: anchorNameFor(listboxId) } as CSSProperties}
      className={cn("relative w-full", className)}
    >
      <Input
        ref={inputRef}
        id={inputId}
        type="search"
        role="combobox"
        label={label}
        aria-label={label ? undefined : ariaLabel}
        placeholder={placeholder}
        disabled={disabled}
        spellCheck={false}
        autoComplete="off"
        value={query}
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={open && results.length > 0 ? optionId(activeIndex) : undefined}
        aria-describedby={statusId}
        onChange={(event) => {
          setQuery(event.target.value);
          if (!open) setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        onClear={() => setQuery("")}
      />

      <span id={statusId} role="status" aria-live="polite" className="sr-only">
        {open ? `${results.length} results available` : ""}
      </span>

      {open ? (
        <SearchComboboxPanel
          items={results}
          query={normalizedQuery}
          activeIndex={activeIndex}
          optionHeight={optionHeight}
          maxListHeight={maxListHeight}
          listRef={listHandle}
          listboxId={listboxId}
          listLabel={label ?? ariaLabel}
          optionId={optionId}
          emptyMessage={emptyMessage}
          onCommit={commit}
          onHover={setActiveIndex}
        />
      ) : null}
    </div>
  );
}
