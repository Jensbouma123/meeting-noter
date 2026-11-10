import { useCallback, useMemo, useState } from "react";
export function useDataListPagination(props, processedItems) {
    const { mode = "virtual", page: controlledPage, defaultPage = 1, pageSize: controlledPageSize, defaultPageSize = 25, onPageChange, onPageSizeChange, } = props;
    const [internalPage, setInternalPage] = useState(defaultPage);
    const [internalPageSize, setInternalPageSize] = useState(defaultPageSize);
    const [jumpPageInput, setJumpPageInput] = useState("");
    const activePage = controlledPage !== undefined ? controlledPage : internalPage;
    const activePageSize = controlledPageSize !== undefined ? controlledPageSize : internalPageSize;
    const handlePageChange = useCallback((newPage) => {
        if (controlledPage === undefined) {
            setInternalPage(newPage);
        }
        onPageChange?.(newPage);
    }, [controlledPage, onPageChange]);
    const handlePageSizeChange = useCallback((newSize) => {
        if (controlledPageSize === undefined) {
            setInternalPageSize(newSize);
            setInternalPage(1);
        }
        onPageSizeChange?.(newSize);
        onPageChange?.(1);
    }, [controlledPageSize, onPageSizeChange, onPageChange]);
    const totalItems = processedItems.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / activePageSize));
    const currentPage = Math.min(Math.max(1, activePage), totalPages);
    const paginatedItems = useMemo(() => {
        if (mode !== "paginated")
            return processedItems;
        const start = (currentPage - 1) * activePageSize;
        return processedItems.slice(start, start + activePageSize);
    }, [mode, processedItems, currentPage, activePageSize]);
    const handleJumpSubmit = (e) => {
        e.preventDefault();
        const targetPage = Number.parseInt(jumpPageInput, 10);
        if (!Number.isNaN(targetPage)) {
            handlePageChange(Math.max(1, Math.min(totalPages, targetPage)));
            setJumpPageInput("");
        }
    };
    return {
        activePageSize,
        totalItems,
        totalPages,
        currentPage,
        paginatedItems,
        handlePageChange,
        handlePageSizeChange,
        jumpPageInput,
        setJumpPageInput,
        handleJumpSubmit,
    };
}
