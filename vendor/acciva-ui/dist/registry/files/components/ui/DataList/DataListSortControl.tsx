import { ArrowDown, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/Button/index";
import { HStack } from "@/components/ui/HStack";
import type { DataListSortDirection, DataListSortOption } from "@/components/ui/DataList/types";

interface DataListSortControlProps<T> {
  id: string;
  options: readonly DataListSortOption<T>[];
  activeKey: string | undefined;
  direction: DataListSortDirection;
  onSortChange: (key: string, direction: DataListSortDirection) => void;
  onToggleDirection: () => void;
}

export function DataListSortControl<T>({
  id,
  options,
  activeKey,
  direction,
  onSortChange,
  onToggleDirection,
}: DataListSortControlProps<T>) {
  return (
    <HStack spacing="xs">
      <label htmlFor={id} className="sr-only">
        Sort by
      </label>
      <select
        id={id}
        value={activeKey}
        onChange={(e) => onSortChange(e.target.value, direction)}
        aria-label="Sort list by"
        className="focus-ring h-9 pointer-coarse:min-h-11 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground"
      >
        {options.map((opt) => (
          <option key={opt.key} value={opt.key}>
            Sort: {opt.label}
          </option>
        ))}
      </select>
      <Button
        variant="outline"
        size="sm"
        iconOnly
        tooltip={`Sort direction: ${direction === "asc" ? "Ascending" : "Descending"}`}
        onClick={onToggleDirection}
        className="h-9 w-9"
      >
        {direction === "asc" ? (
          <ArrowUp className="size-3.5 text-primary-800 dark:text-primary-300" />
        ) : (
          <ArrowDown className="size-3.5 text-primary-800 dark:text-primary-300" />
        )}
      </Button>
    </HStack>
  );
}
