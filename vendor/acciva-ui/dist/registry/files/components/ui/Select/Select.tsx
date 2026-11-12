"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from "react";
import { CONTROL_HEIGHT, CONTROL_RADIUS, INPUT_PADDING_X, TEXT_SIZE, resolveResponsive } from "@/lib/sizing-tokens/index";
import { cn } from "@/lib/utils";
import { VStack } from "@/components/ui/VStack";
import { firstEnabledIndex } from "@/components/ui/Select/navigation";
import { SelectListbox } from "@/components/ui/Select/SelectParts";
import type { SelectProps } from "@/components/ui/Select/types";
import { useSelectKeyDown } from "@/components/ui/Select/useSelectKeyDown";
import { useSelectListEffects } from "@/components/ui/Select/useSelectListEffects";

export function Select({
  id,
  options,
  value,
  onChange,
  label,
  placeholder = "Select an option",
  disabled = false,
  size = "md",
  className,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const baseId = useId();
  const listId = `${baseId}-listbox`;
  const labelId = `${baseId}-label`;
  const buttonId = id ?? `${baseId}-button`;
  const anchorName = `--select-${baseId.replace(/[^\w-]/g, "")}`;

  const selectedIndex = useMemo(() => options.findIndex((option) => option.value === value), [options, value]);
  const [activeIndex, setActiveIndex] = useState(() => (selectedIndex === -1 ? 0 : selectedIndex));
  const selectedOption = selectedIndex === -1 ? null : options[selectedIndex];

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    if (!label && !ariaLabel && !ariaLabelledBy) {
      console.warn(
        "[a11y] <Select> has no accessible name. Pass a label, aria-label, or aria-labelledby so screen readers can announce the control.",
      );
    }
  }, [label, ariaLabel, ariaLabelledBy]);

  useSelectListEffects(open, activeIndex, buttonRef, listRef, setOpen);

  const openList = () => {
    const start = firstEnabledIndex(options, selectedIndex === -1 ? 0 : selectedIndex, 1);
    setActiveIndex(start === -1 ? 0 : start);
    setOpen(true);
  };

  const commit = (index: number) => {
    const option = options[index];
    setOpen(false);
    if (!option || option.disabled) return;
    onChange(option.value);
  };

  const handleKeyDown = useSelectKeyDown(
    options,
    disabled,
    open,
    activeIndex,
    setActiveIndex,
    setOpen,
    openList,
    commit,
    onChange,
  );

  return (
    <VStack spacing="sm" className="w-full">
      {label ? (
        <span id={labelId} className="text-sm font-medium text-foreground">
          {label}
        </span>
      ) : null}
      <div className="relative">
        <button
          ref={buttonRef}
          id={buttonId}
          type="button"
          role="combobox"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-activedescendant={open && activeIndex >= 0 ? `${baseId}-option-${activeIndex}` : undefined}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy ?? (label ? `${labelId} ${buttonId}` : undefined)}
          onClick={() => (open ? setOpen(false) : openList())}
          onKeyDown={handleKeyDown}
          onBlur={() => setOpen(false)}
          style={{ anchorName } as CSSProperties}
          className={cn(
            "touch-target-44 focus-ring flex w-full items-center justify-between border border-border bg-background text-foreground",
            resolveResponsive(size, CONTROL_HEIGHT),
            resolveResponsive(size, CONTROL_RADIUS),
            resolveResponsive(size, TEXT_SIZE),
            resolveResponsive(size, INPUT_PADDING_X),
            "transition-colors hover:border-muted-foreground/60 active:border-muted-foreground active:bg-elevation-2 dark:active:bg-elevation-3 disabled:cursor-not-allowed disabled:opacity-60",
            className,
          )}
        >
          <span className={cn(!selectedOption && "text-muted-foreground")}>{selectedOption?.label ?? placeholder}</span>
          <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
        </button>
        {open ? (
          <SelectListbox
            listRef={listRef}
            listId={listId}
            baseId={baseId}
            anchorName={anchorName}
            options={options}
            value={value}
            activeIndex={activeIndex}
            ariaLabel={ariaLabel}
            labelledBy={ariaLabelledBy ?? (label ? labelId : undefined)}
            onCommit={commit}
            onActivate={setActiveIndex}
          />
        ) : null}
      </div>
    </VStack>
  );
}
