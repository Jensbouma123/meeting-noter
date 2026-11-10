import type { HTMLAttributes } from "react";
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
export declare function Pagination({ page, totalPages, onPageChange, pageSize, totalItems, pageSizeOptions, onPageSizeChange, showPageSizePicker, showPageJump, siblingCount, ariaLabel, "aria-label": ariaLabelAttr, className, ...props }: PaginationProps): import("react").JSX.Element;
