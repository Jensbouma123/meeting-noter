"use client";

import { useId, useMemo, useRef, useState } from "react";
import { Grid } from "@/components/ui/Grid/index";
import { Input } from "@/components/ui/Input/index";
import { SearchableSelect } from "@/components/ui/SearchableSelect/index";
import { VStack } from "@/components/ui/VStack";
import { ALL_ICON_NAMES, type IconCategory } from "@/lib/icon-registry";
import { cn } from "@/lib/utils";
import { getIconOptions } from "@/components/ui/IconPicker/iconOptions";
import { IconCategoryChips, IconOptionButton, SelectedIconPreview } from "@/components/ui/IconPicker/IconPickerParts";
import type { IconPickerProps } from "@/components/ui/IconPicker/types";
import { useIconGridKeyDown } from "@/components/ui/IconPicker/useIconGridKeyDown";
import { useIconInputKeyDown } from "@/components/ui/IconPicker/useIconInputKeyDown";
import { useIconPickerDismiss } from "@/components/ui/IconPicker/useIconPickerDismiss";

export function IconPicker({ value, onChange, variant = "grid", label = "Icon", className }: IconPickerProps) {
  if (variant === "dropdown") {
    return (
      <SearchableSelect
        label={label}
        options={getIconOptions()}
        value={value || null}
        onChange={onChange}
        placeholder="Search icons…"
        emptyMessage="No icons match"
        className={className}
      />
    );
  }
  return <IconPickerGrid value={value} onChange={onChange} className={className} />;
}

function IconPickerGrid({ value, onChange, className }: Omit<IconPickerProps, "variant" | "label">) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<IconCategory | "All">("All");
  const [activeIndex, setActiveIndex] = useState(() => Math.max(0, ALL_ICON_NAMES.findIndex((entry) => entry.name === value)));
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const suppressOpenOnFocusRef = useRef(false);
  const listId = useId();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ALL_ICON_NAMES.filter((entry) => {
      const matchesCategory = category === "All" || entry.category === category;
      const matchesQuery = !q || entry.name.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [query, category]);

  const rovingIndex = Math.min(Math.max(activeIndex, 0), Math.max(filtered.length - 1, 0));

  useIconPickerDismiss(containerRef, open, setOpen);

  const closeAndFocusTrigger = () => {
    setOpen(false);
    setQuery("");
    suppressOpenOnFocusRef.current = true;
    inputRef.current?.focus({ preventScroll: true });
  };

  const commit = (iconName: string) => {
    onChange(iconName);
    closeAndFocusTrigger();
  };

  const handleInputKeyDown = useIconInputKeyDown(open, setOpen, gridRef, rovingIndex);
  const handleGridKeyDown = useIconGridKeyDown(gridRef, filtered, setActiveIndex, commit, closeAndFocusTrigger);

  return (
    <VStack ref={containerRef} spacing="none" className={cn("relative w-full", className)}>
      <Input
        ref={inputRef}
        role="combobox"
        aria-controls={open ? listId : undefined}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Search icons"
        placeholder="Search icons…"
        value={query}
        onFocus={() => {
          if (suppressOpenOnFocusRef.current) {
            suppressOpenOnFocusRef.current = false;
            return;
          }
          setOpen(true);
        }}
        onClick={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setActiveIndex(0);
          if (!open) setOpen(true);
        }}
        onKeyDown={handleInputKeyDown}
        leadingIcon={<SelectedIconPreview name={value} />}
        size="sm"
      />
      {open && (
        <VStack
          spacing="md"
          inset="md"
          className="absolute top-full z-50 mt-1.5 w-full rounded-xl border border-border bg-surface shadow-lg"
        >
          <IconCategoryChips
            category={category}
            onSelect={(option) => {
              setCategory(option);
              setActiveIndex(0);
            }}
          />
          <Grid
            ref={gridRef}
            id={listId}
            role="listbox"
            aria-label="Icon picker"
            onKeyDown={handleGridKeyDown}
            columns={{ base: 6, sm: 8 }}
            spacing="xs"
            inset="sm"
            className="max-h-64 overflow-y-auto rounded-lg border border-border bg-background"
          >
            {filtered.map((entry, index) => (
              <IconOptionButton
                key={entry.name}
                name={entry.name}
                selected={value === entry.name}
                tabIndex={index === rovingIndex ? 0 : -1}
                onFocus={() => setActiveIndex(index)}
                onClick={() => {
                  setActiveIndex(index);
                  commit(entry.name);
                }}
              />
            ))}
            {filtered.length === 0 ? (
              <p className="col-span-full py-6 text-center text-sm text-muted-foreground">No icons match &ldquo;{query}&rdquo;.</p>
            ) : null}
          </Grid>
        </VStack>
      )}
    </VStack>
  );
}
