import { HStack } from "@/components/ui/HStack";
import type { DataListProps } from "@/components/ui/DataList/DataListProps";
import { DataListPageButtons } from "@/components/ui/DataList/DataListPageButtons";
import { DataListPageJump } from "@/components/ui/DataList/DataListPageJump";
import type { DataListView } from "@/components/ui/DataList/useDataListView";
import { DEFAULT_PAGE_SIZE_OPTIONS } from "@/components/ui/DataList/utils";

interface DataListPaginationProps<T> {
  props: DataListProps<T>;
  view: DataListView<T>;
}

export function DataListPagination<T>({ props, view }: DataListPaginationProps<T>) {
  const {
    mode = "virtual",
    showPageSizePicker = true,
    showPageJump = true,
    pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  } = props;

  if (mode !== "paginated" || view.totalItems === 0) return null;

  const startItem = (view.currentPage - 1) * view.activePageSize + 1;
  const endItem = Math.min(view.currentPage * view.activePageSize, view.totalItems);

  return (
    <HStack
      as="nav"
      role="navigation"
      aria-label="Pagination"
      spacing="lg"
      wrap
      justify="between"
      className="border-t border-border/80 pt-4"
    >
      <HStack spacing="md" wrap className="text-xs text-muted-foreground">
        <span>
          Showing <span className="font-medium text-foreground">{startItem}</span> to{" "}
          <span className="font-medium text-foreground">{endItem}</span> of{" "}
          <span className="font-medium text-foreground">{view.totalItems.toLocaleString()}</span> items
        </span>

        {showPageSizePicker && (
          // Raw flex: `gap-1.5` is a half step, off the full-step spacing scale.
          <div className="flex items-center gap-1.5 pl-2 border-l border-border">
            <label htmlFor={`${view.generatedId}-page-size`} className="sr-only">
              Items per page
            </label>
            <span aria-hidden="true">Rows:</span>
            <select
              id={`${view.generatedId}-page-size`}
              value={view.activePageSize}
              onChange={(e) => view.handlePageSizeChange(Number(e.target.value))}
              aria-label="Items per page"
              className="focus-ring h-8 pointer-coarse:min-h-11 rounded-md border border-border bg-background px-2 text-xs text-foreground"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </HStack>

      {/* Raw flex: `gap-1.5` is a half step, off the full-step spacing scale. */}
      <div className="flex flex-wrap items-center gap-1.5">
        <DataListPageButtons
          currentPage={view.currentPage}
          totalPages={view.totalPages}
          onPageChange={view.handlePageChange}
        />

        {showPageJump && view.totalPages > 3 && (
          <DataListPageJump
            id={`${view.generatedId}-page-jump`}
            currentPage={view.currentPage}
            totalPages={view.totalPages}
            value={view.jumpPageInput}
            onValueChange={view.setJumpPageInput}
            onSubmit={view.handleJumpSubmit}
          />
        )}
      </div>
    </HStack>
  );
}
