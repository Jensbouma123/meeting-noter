import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { RowListItem } from "@/components/ui/RowList/RowListItem";

export interface RowListProps extends HTMLAttributes<HTMLUListElement> {
  /** Names the list for assistive tech (SC 1.3.1, 4.1.2). Required. */
  "aria-label": string;
  /** Draws a hairline between rows. */
  divided?: boolean;
}

const RowListRoot = forwardRef<HTMLUListElement, RowListProps>(function RowList(
  { divided = false, className, ...props },
  ref,
) {
  return (
    <ul
      ref={ref}
      className={cn("m-0 list-none p-0", divided && "divide-y divide-border", className)}
      {...props}
    />
  );
});

export const RowList = Object.assign(RowListRoot, { Item: RowListItem });
