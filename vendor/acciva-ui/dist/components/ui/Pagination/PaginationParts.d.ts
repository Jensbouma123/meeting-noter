import type { FormEvent } from "react";
export declare function PaginationSummary({ page, totalPages, pageSize, totalItems, }: {
    page: number;
    totalPages: number;
    pageSize?: number;
    totalItems?: number;
}): import("react").JSX.Element;
export declare function PaginationSizePicker({ pageSize, options, onChange, }: {
    pageSize: number;
    options: number[];
    onChange: (pageSize: number) => void;
}): import("react").JSX.Element;
export declare function PaginationPageList({ pages, current, onPageChange, }: {
    pages: (number | "ellipsis")[];
    current: number;
    onPageChange: (page: number) => void;
}): import("react").JSX.Element;
export declare function PaginationJumpForm({ value, max, onValueChange, onSubmit, }: {
    value: string;
    max: number;
    onValueChange: (value: string) => void;
    onSubmit: (e: FormEvent) => void;
}): import("react").JSX.Element;
