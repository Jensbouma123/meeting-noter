import type { FormEvent } from "react";
import { Button } from "@/components/ui/Button/index";
import { HStack } from "@/components/ui/HStack";

export function PaginationSummary({
  page,
  totalPages,
  pageSize,
  totalItems,
}: {
  page: number;
  totalPages: number;
  pageSize?: number;
  totalItems?: number;
}) {
  if (totalItems !== undefined && pageSize !== undefined) {
    return (
      <div className="text-xs text-muted-foreground">
        Showing{" "}
        <span className="font-medium text-foreground">{Math.min(totalItems, (page - 1) * pageSize + 1)}</span>{" "}
        to{" "}
        <span className="font-medium text-foreground">{Math.min(totalItems, page * pageSize)}</span> of{" "}
        <span className="font-medium text-foreground">{totalItems.toLocaleString()}</span> results
      </div>
    );
  }
  return (
    <div className="text-xs text-muted-foreground">
      Page <span className="font-medium text-foreground">{page}</span> of{" "}
      <span className="font-medium text-foreground">{Math.max(1, totalPages)}</span>
    </div>
  );
}

export function PaginationSizePicker({
  pageSize,
  options,
  onChange,
}: {
  pageSize: number;
  options: number[];
  onChange: (pageSize: number) => void;
}) {
  return (
    <div className="flex items-center gap-2 mr-2">
      <span className="text-xs text-muted-foreground">Rows:</span>
      <select
        aria-label="Select rows per page"
        value={pageSize}
        onChange={(e) => onChange(Number(e.target.value))}
        className="focus-ring h-8 pointer-coarse:min-h-11 rounded-md border border-border bg-surface px-2 text-xs font-medium text-foreground transition-colors hover:border-muted-foreground/60 active:border-muted-foreground"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

export function PaginationPageList({
  pages,
  current,
  onPageChange,
}: {
  pages: (number | "ellipsis")[];
  current: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <HStack spacing="xs">
      {pages.map((p, idx) => {
        if (p === "ellipsis") {
          return (
            <span
              key={`ellipsis-${idx}`}
              aria-hidden="true"
              className="flex size-7 items-center justify-center text-xs text-muted-foreground"
            >
              …
            </span>
          );
        }

        const isCurrent = p === current;
        return (
          <Button
            key={p}
            size="xs"
            variant={isCurrent ? "primary" : "ghost"}
            aria-current={isCurrent ? "page" : undefined}
            aria-label={`Page ${p}`}
            onClick={() => onPageChange(p)}
            className="size-7 p-0"
          >
            {p}
          </Button>
        );
      })}
    </HStack>
  );
}

export function PaginationJumpForm({
  value,
  max,
  onValueChange,
  onSubmit,
}: {
  value: string;
  max: number;
  onValueChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="ml-2 flex items-center gap-2">
      <input
        type="number"
        min={1}
        max={max}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder="Page"
        aria-label="Jump to page number"
        className="focus-ring h-8 w-14 pointer-coarse:min-h-11 rounded-md border border-border bg-surface px-2 text-center text-xs font-medium text-foreground transition-colors hover:border-muted-foreground/60 active:border-muted-foreground"
      />
      <Button type="submit" size="xs" variant="outline">
        Go
      </Button>
    </form>
  );
}
