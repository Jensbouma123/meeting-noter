import type { FormEvent } from "react";
import { Button } from "@/components/ui/Button/index";

interface DataListPageJumpProps {
  id: string;
  currentPage: number;
  totalPages: number;
  value: string;
  onValueChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
}

export function DataListPageJump({
  id,
  currentPage,
  totalPages,
  value,
  onValueChange,
  onSubmit,
}: DataListPageJumpProps) {
  return (
    // Raw flex: `hidden`/`md:flex` is a display toggle, and `gap-1.5` a half step.
    <form onSubmit={onSubmit} className="hidden md:flex items-center gap-1.5 pl-2 border-l border-border">
      <label htmlFor={id} className="text-xs text-muted-foreground">
        Go to:
      </label>
      <input
        id={id}
        type="number"
        min={1}
        max={totalPages}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={`${currentPage}`}
        className="focus-ring h-8 w-14 pointer-coarse:min-h-11 rounded-md border border-border bg-background px-2 text-center text-xs text-foreground"
        aria-label={`Jump to page between 1 and ${totalPages}`}
      />
      <Button type="submit" variant="secondary" size="sm" className="h-8 px-2 text-xs">
        Go
      </Button>
    </form>
  );
}
