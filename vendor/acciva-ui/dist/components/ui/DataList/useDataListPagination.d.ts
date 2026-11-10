import { type FormEvent } from "react";
import type { DataListProps } from "./DataListProps.js";
export declare function useDataListPagination<T>(props: DataListProps<T>, processedItems: readonly T[]): {
    activePageSize: number;
    totalItems: number;
    totalPages: number;
    currentPage: number;
    paginatedItems: readonly T[];
    handlePageChange: (newPage: number) => void;
    handlePageSizeChange: (newSize: number) => void;
    jumpPageInput: string;
    setJumpPageInput: import("react").Dispatch<import("react").SetStateAction<string>>;
    handleJumpSubmit: (e: FormEvent) => void;
};
