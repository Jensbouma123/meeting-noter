"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import type { HTMLAttributes } from "react";
import { Button } from "@/components/ui/Button/index";
import { cn } from "@/lib/utils";
import { HStack } from "@/components/ui/HStack";
import { getPageNumbers } from "@/components/ui/Pagination/pageNumbers";
import { PaginationJumpForm, PaginationPageList, PaginationSizePicker, PaginationSummary } from "@/components/ui/Pagination/PaginationParts";
import { usePageJump } from "@/components/ui/Pagination/usePageJump";

export interface PaginationProps extends Omit<HTMLAttributes<HTMLElement>, "onChange"> {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
  totalItems?: number;
  pageSizeOptions?: number[];
  onPageSizeChange?: (pageSize: number) => void;
  showPageSizePicker?: boolean;
  showPageJump?: boolean;
  siblingCount?: number;
  /**
   * @deprecated Use `aria-label`. Kept working so no caller breaks; it loses to
   * `aria-label` when both are set and will be removed in a future major.
   */
  ariaLabel?: string;
  "aria-label"?: string;
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
  pageSize,
  totalItems,
  pageSizeOptions = [10, 25, 50, 100],
  onPageSizeChange,
  showPageSizePicker = false,
  showPageJump = false,
  siblingCount = 1,
  ariaLabel,
  "aria-label": ariaLabelAttr,
  className,
  ...props
}: PaginationProps) {
  const accessibleName = ariaLabelAttr ?? ariaLabel ?? "Pagination navigation";
  const [jumpInput, setJumpInput, handleJumpSubmit] = usePageJump(totalPages, onPageChange);
  const safeCurrentPage = Math.min(Math.max(1, page), Math.max(1, totalPages));
  const pageNumbers = getPageNumbers(totalPages, safeCurrentPage, siblingCount);

  return (
    <HStack
      as="nav"
      role="navigation"
      aria-label={accessibleName}
      wrap
      justify="between"
      spacing="lg"
      className={cn("py-2", className)}
      {...props}
    >
      <PaginationSummary page={safeCurrentPage} totalPages={totalPages} pageSize={pageSize} totalItems={totalItems} />

      <div className="flex flex-wrap items-center gap-2">
        {showPageSizePicker && onPageSizeChange && pageSize ? (
          <PaginationSizePicker pageSize={pageSize} options={pageSizeOptions} onChange={onPageSizeChange} />
        ) : null}

        <Button
          variant="outline"
          size="xs"
          iconOnly
          tooltip="Go to first page"
          aria-disabled={safeCurrentPage <= 1 || undefined}
          onClick={() => !(safeCurrentPage <= 1) && onPageChange(1)}
        >
          <ChevronsLeft className="size-3.5" />
        </Button>

        <Button
          variant="outline"
          size="xs"
          iconOnly
          tooltip="Go to previous page"
          aria-disabled={safeCurrentPage <= 1 || undefined}
          onClick={() => !(safeCurrentPage <= 1) && onPageChange(safeCurrentPage - 1)}
        >
          <ChevronLeft className="size-3.5" />
        </Button>

        <PaginationPageList pages={pageNumbers} current={safeCurrentPage} onPageChange={onPageChange} />

        <Button
          variant="outline"
          size="xs"
          iconOnly
          tooltip="Go to next page"
          aria-disabled={safeCurrentPage >= totalPages || undefined}
          onClick={() => !(safeCurrentPage >= totalPages) && onPageChange(safeCurrentPage + 1)}
        >
          <ChevronRight className="size-3.5" />
        </Button>

        <Button
          variant="outline"
          size="xs"
          iconOnly
          tooltip="Go to last page"
          aria-disabled={safeCurrentPage >= totalPages || undefined}
          onClick={() => !(safeCurrentPage >= totalPages) && onPageChange(totalPages)}
        >
          <ChevronsRight className="size-3.5" />
        </Button>

        {showPageJump ? (
          <PaginationJumpForm
            value={jumpInput}
            max={totalPages}
            onValueChange={setJumpInput}
            onSubmit={handleJumpSubmit}
          />
        ) : null}
      </div>
    </HStack>
  );
}
