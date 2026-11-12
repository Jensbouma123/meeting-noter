import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/Button/index";
import { getPageNumbers } from "@/components/ui/DataList/utils";

interface DataListPageButtonsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function DataListPageButtons({ currentPage, totalPages, onPageChange }: DataListPageButtonsProps) {
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        iconOnly
        tooltip="First page"
        aria-disabled={currentPage <= 1 || undefined}
        onClick={() => !(currentPage <= 1) && onPageChange(1)}
      >
        <ChevronsLeft className="size-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        iconOnly
        tooltip="Previous page"
        aria-disabled={currentPage <= 1 || undefined}
        onClick={() => !(currentPage <= 1) && onPageChange(currentPage - 1)}
      >
        <ChevronLeft className="size-4" />
      </Button>

      {/* Raw flex: `hidden`/`sm:flex` is a display toggle no `Stack` prop can express. */}
      <div className="hidden sm:flex items-center gap-1">
        {getPageNumbers(currentPage, totalPages).map((p, idx) =>
          p === "ellipsis" ? (
            <span key={`ellipsis-${idx}`} className="px-1.5 text-xs text-muted-foreground">
              ...
            </span>
          ) : (
            <Button
              key={p}
              variant={currentPage === p ? "primary" : "outline"}
              size="sm"
              aria-current={currentPage === p ? "page" : undefined}
              aria-label={`Page ${p}`}
              onClick={() => onPageChange(p)}
              className="min-w-8 px-2.5 text-xs"
            >
              {p}
            </Button>
          ),
        )}
      </div>

      <Button
        variant="outline"
        size="sm"
        iconOnly
        tooltip="Next page"
        aria-disabled={currentPage >= totalPages || undefined}
        onClick={() => !(currentPage >= totalPages) && onPageChange(currentPage + 1)}
      >
        <ChevronRight className="size-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        iconOnly
        tooltip="Last page"
        aria-disabled={currentPage >= totalPages || undefined}
        onClick={() => !(currentPage >= totalPages) && onPageChange(totalPages)}
      >
        <ChevronsRight className="size-4" />
      </Button>
    </>
  );
}
