"use client";

import { useCallback, useDeferredValue, useEffect, useId, useMemo, useRef, useState } from "react";
import type { VirtualListHandle } from "@/components/ui/VirtualList/index";
import { cn } from "@/lib/utils";
import { VStack } from "@/components/ui/VStack";
import { DEFAULT_MAX_LIST_HEIGHT, DEFAULT_OPTION_HEIGHT, defaultFilter } from "@/components/ui/SearchableSelect/defaults";
import { SearchableSelectPanel } from "@/components/ui/SearchableSelect/SearchableSelectPanel";
import { SearchableSelectTrigger } from "@/components/ui/SearchableSelect/SearchableSelectParts";
import type { SearchableSelectProps } from "@/components/ui/SearchableSelect/types";
import { useActiveIndex } from "@/components/ui/SearchableSelect/useActiveIndex";
import { useDismissOnPointerDown } from "@/components/ui/SearchableSelect/useDismissOnPointerDown";
import { useSearchableKeyDown } from "@/components/ui/SearchableSelect/useSearchableKeyDown";

export function SearchableSelect({
  id,
  options,
  value,
  onChange,
  label,
  placeholder = "Search options…",
  emptyMessage = "No options match",
  disabled = false,
  clearable = false,
  optionHeight = DEFAULT_OPTION_HEIGHT,
  maxListHeight = DEFAULT_MAX_LIST_HEIGHT,
  filter = defaultFilter,
  className,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listHandle = useRef<VirtualListHandle>(null);
  const baseId = useId();
  const inputId = id ?? `${baseId}-input`;
  const listboxId = `${baseId}-listbox`;
  const labelId = `${baseId}-label`;
  const statusId = `${baseId}-status`;
  const optionId = useCallback((index: number) => `${baseId}-option-${index}`, [baseId]);

  const selectedOption = useMemo(() => options.find((option) => option.value === value) ?? null, [options, value]);

  const normalizedQuery = deferredQuery.trim().toLowerCase();
  const filteredOptions = useMemo(() => {
    if (!normalizedQuery) return options;
    return options.filter((option) => filter(option, normalizedQuery));
  }, [options, normalizedQuery, filter]);

  const [activeIndex, setActiveIndex, moveActive] = useActiveIndex(open, filteredOptions, value);
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
      const option = filteredOptions[index];
      if (!option || option.disabled) return;
      onChange(option.value);
      close();
      inputRef.current?.focus({ preventScroll: true });
    },
    [filteredOptions, onChange, close],
  );

  const handleKeyDown = useSearchableKeyDown(
    disabled,
    open,
    setOpen,
    filteredOptions,
    activeIndex,
    setActiveIndex,
    moveActive,
    commit,
    close,
  );

  return (
    <VStack spacing="sm" className={cn("w-full", className)}>
      {label ? (
        <label id={labelId} htmlFor={inputId} className="text-sm font-medium text-foreground">
          {label}
        </label>
      ) : null}

      <div ref={containerRef} className="relative">
        <SearchableSelectTrigger
          inputId={inputId}
          inputRef={inputRef}
          labelId={label ? labelId : undefined}
          listboxId={listboxId}
          statusId={statusId}
          activeId={open && filteredOptions.length > 0 ? optionId(activeIndex) : undefined}
          disabled={disabled}
          open={open}
          query={query}
          placeholder={placeholder}
          selected={selectedOption}
          clearable={clearable}
          onInputChange={(next) => {
            setQuery(next);
            if (!open) setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          onToggle={() => {
            setOpen((previous) => !previous);
            inputRef.current?.focus({ preventScroll: true });
          }}
          onClear={() => {
            onChange("");
            setQuery("");
            inputRef.current?.focus({ preventScroll: true });
          }}
        />

        <span id={statusId} role="status" aria-live="polite" className="sr-only">
          {open ? `${filteredOptions.length} options available` : ""}
        </span>

        {open ? (
          <SearchableSelectPanel
            items={filteredOptions}
            value={value}
            query={normalizedQuery}
            activeIndex={activeIndex}
            optionHeight={optionHeight}
            maxListHeight={maxListHeight}
            listRef={listHandle}
            listboxId={listboxId}
            labelId={label ? labelId : undefined}
            optionId={optionId}
            emptyMessage={emptyMessage}
            onCommit={commit}
            onHover={setActiveIndex}
          />
        ) : null}
      </div>
    </VStack>
  );
}
