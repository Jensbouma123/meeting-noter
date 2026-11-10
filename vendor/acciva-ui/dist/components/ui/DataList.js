"use client";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Ellipsis, Loader2, Search, X, } from "lucide-react";
import { useCallback, useDeferredValue, useEffect, useId, useImperativeHandle, useMemo, useRef, useState, } from "react";
import { Button } from "../../components/ui/Button.js";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, } from "../../components/ui/DropdownMenu.js";
import { HStack } from "../../components/ui/HStack.js";
import { VirtualList, } from "../../components/ui/VirtualList.js";
import { VStack } from "../../components/ui/VStack.js";
import { cn } from "../../lib/utils.js";
const DEFAULT_PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const DEFAULT_VIRTUAL_HEIGHT = 480;
const DEFAULT_ITEM_HEIGHT_LIST = 72;
const DEFAULT_ITEM_HEIGHT_GRID = 200;
function defaultKeyExtractor(item, index) {
    var _a;
    if (item && typeof item === "object") {
        const candidate = (_a = item.id) !== null && _a !== void 0 ? _a : item.key;
        if (typeof candidate === "string" || typeof candidate === "number") {
            return candidate;
        }
    }
    return index;
}
function extractItemSearchString(item, keys) {
    if (keys && keys.length > 0) {
        return keys
            .map((key) => {
            var _a;
            if (typeof key === "function")
                return key(item);
            if (typeof key === "string" && item && typeof item === "object") {
                return String((_a = item[key]) !== null && _a !== void 0 ? _a : "");
            }
            return "";
        })
            .join(" ")
            .toLowerCase();
    }
    if (typeof item === "string" || typeof item === "number") {
        return String(item).toLowerCase();
    }
    if (item && typeof item === "object") {
        return Object.values(item)
            .filter((val) => typeof val === "string" || typeof val === "number")
            .join(" ")
            .toLowerCase();
    }
    return "";
}
function chunkArray(array, size) {
    if (size <= 0)
        return [array.slice()];
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}
function toVirtualRole(role) {
    if (role === "feed" || role === "list")
        return "list";
    if (role === "listbox")
        return "listbox";
    if (role === "grid")
        return "rowgroup";
    return "list";
}
function toVirtualItemRole(itemRole) {
    if (itemRole === "article" || itemRole === "listitem")
        return "listitem";
    if (itemRole === "option")
        return "option";
    if (itemRole === "row")
        return "row";
    return "listitem";
}
export function DataList({ items, renderItem, tableColumns, showColumnHeaders = true, mode = "virtual", layout = "list", columns = 3, gap = 16, getItemKey = defaultKeyExtractor, getItemId, isItemDisabled, itemHeight, height = DEFAULT_VIRTUAL_HEIGHT, overscan = 4, dynamic = false, onVisibleRangeChange, page: controlledPage, defaultPage = 1, pageSize: controlledPageSize, defaultPageSize = 25, pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS, showPageSizePicker = true, showPageJump = true, onPageChange, onPageSizeChange, paginationPlacement = "bottom", hasMore = false, isLoadingMore = false, onLoadMore, skeletonCount = 3, renderSkeleton, scrollThresholdPx = 200, searchable = false, searchQuery: controlledSearchQuery, defaultSearchQuery = "", onSearchChange, searchPlaceholder = "Search list...", filterFn, searchKeys, sortable = false, sortOptions, sortKey: controlledSortKey, defaultSortKey, sortDirection: controlledSortDirection, defaultSortDirection = "asc", onSortChange, sortFn, selectionMode = "none", selectedKeys: controlledSelectedKeys, defaultSelectedKeys = [], onSelectionChange, onItemClick, showSelectionToolbar = true, rowActions, rowActionsLabel = "Row actions", onReorder, role: customRole, itemRole: customItemRole, ariaLabel: deprecatedAriaLabel, ariaLabelledBy: deprecatedAriaLabelledBy, ariaDescribedBy: deprecatedAriaDescribedBy, "aria-label": ariaLabelAttr, "aria-labelledby": ariaLabelledByAttr, "aria-describedby": ariaDescribedByAttr, interactive = true, header, footer, toolbar, emptyState, emptyMessage = "No items found", loading = false, loadingState, className, listClassName, itemClassName, listRef, }) {
    var _a;
    const ariaLabel = ariaLabelAttr !== null && ariaLabelAttr !== void 0 ? ariaLabelAttr : deprecatedAriaLabel;
    const ariaLabelledBy = ariaLabelledByAttr !== null && ariaLabelledByAttr !== void 0 ? ariaLabelledByAttr : deprecatedAriaLabelledBy;
    const ariaDescribedBy = ariaDescribedByAttr !== null && ariaDescribedByAttr !== void 0 ? ariaDescribedByAttr : deprecatedAriaDescribedBy;
    const generatedId = useId();
    const searchInputId = `${generatedId}-search`;
    const statusRegionId = `${generatedId}-status`;
    const listContainerRef = useRef(null);
    const virtualListRef = useRef(null);
    const sentinelRef = useRef(null);
    const [internalSearchQuery, setInternalSearchQuery] = useState(defaultSearchQuery);
    const activeSearchQuery = controlledSearchQuery !== undefined ? controlledSearchQuery : internalSearchQuery;
    const deferredSearchQuery = useDeferredValue(activeSearchQuery);
    const handleSearchChange = useCallback((newQuery) => {
        if (controlledSearchQuery === undefined) {
            setInternalSearchQuery(newQuery);
        }
        onSearchChange === null || onSearchChange === void 0 ? void 0 : onSearchChange(newQuery);
    }, [controlledSearchQuery, onSearchChange]);
    const [internalSortKey, setInternalSortKey] = useState(defaultSortKey !== null && defaultSortKey !== void 0 ? defaultSortKey : (_a = sortOptions === null || sortOptions === void 0 ? void 0 : sortOptions[0]) === null || _a === void 0 ? void 0 : _a.key);
    const [internalSortDirection, setInternalSortDirection] = useState(defaultSortDirection);
    const activeSortKey = controlledSortKey !== undefined ? controlledSortKey : internalSortKey;
    const activeSortDirection = controlledSortDirection !== undefined ? controlledSortDirection : internalSortDirection;
    const handleSortChange = useCallback((key, direction) => {
        if (controlledSortKey === undefined)
            setInternalSortKey(key);
        if (controlledSortDirection === undefined)
            setInternalSortDirection(direction);
        onSortChange === null || onSortChange === void 0 ? void 0 : onSortChange(key, direction);
    }, [controlledSortKey, controlledSortDirection, onSortChange]);
    const toggleSortDirection = useCallback(() => {
        const nextDirection = activeSortDirection === "asc" ? "desc" : "asc";
        if (activeSortKey) {
            handleSortChange(activeSortKey, nextDirection);
        }
    }, [activeSortKey, activeSortDirection, handleSortChange]);
    const [internalSelectedKeys, setInternalSelectedKeys] = useState(() => new Set(defaultSelectedKeys));
    const selectedKeySet = useMemo(() => {
        if (controlledSelectedKeys !== undefined) {
            return controlledSelectedKeys instanceof Set
                ? controlledSelectedKeys
                : new Set(controlledSelectedKeys);
        }
        return internalSelectedKeys;
    }, [controlledSelectedKeys, internalSelectedKeys]);
    const updateSelection = useCallback((newSet, allItems) => {
        if (controlledSelectedKeys === undefined) {
            setInternalSelectedKeys(newSet);
        }
        if (onSelectionChange) {
            const selectedList = Array.from(newSet);
            const selectedItemObjects = allItems.filter((item, idx) => newSet.has(getItemKey(item, idx)));
            onSelectionChange(selectedList, selectedItemObjects);
        }
    }, [controlledSelectedKeys, onSelectionChange, getItemKey]);
    const [internalPage, setInternalPage] = useState(defaultPage);
    const [internalPageSize, setInternalPageSize] = useState(defaultPageSize);
    const [jumpPageInput, setJumpPageInput] = useState("");
    const activePage = controlledPage !== undefined ? controlledPage : internalPage;
    const activePageSize = controlledPageSize !== undefined ? controlledPageSize : internalPageSize;
    const handlePageChange = useCallback((newPage) => {
        if (controlledPage === undefined) {
            setInternalPage(newPage);
        }
        onPageChange === null || onPageChange === void 0 ? void 0 : onPageChange(newPage);
    }, [controlledPage, onPageChange]);
    const handlePageSizeChange = useCallback((newSize) => {
        if (controlledPageSize === undefined) {
            setInternalPageSize(newSize);
            setInternalPage(1);
        }
        onPageSizeChange === null || onPageSizeChange === void 0 ? void 0 : onPageSizeChange(newSize);
        onPageChange === null || onPageChange === void 0 ? void 0 : onPageChange(1);
    }, [controlledPageSize, onPageSizeChange, onPageChange]);
    const [activeIndex, setActiveIndex] = useState(0);
    // Polite announcement of the last reorder ("Moved item from position 2 to
    // position 3", SC 4.1.3). Stored with the result-set key it was made under, so
    // it is hidden (derived, no effect) once the result set changes.
    const [reorderNote, setReorderNote] = useState(null);
    const filteredItems = useMemo(() => {
        const query = deferredSearchQuery.trim().toLowerCase();
        if (!query)
            return items;
        if (filterFn) {
            return items.filter((item) => filterFn(item, query));
        }
        return items.filter((item) => {
            const text = extractItemSearchString(item, searchKeys);
            return text.includes(query);
        });
    }, [items, deferredSearchQuery, filterFn, searchKeys]);
    const processedItems = useMemo(() => {
        if (!sortable && !sortFn)
            return filteredItems;
        const list = [...filteredItems];
        const factor = activeSortDirection === "asc" ? 1 : -1;
        if (sortFn) {
            return list.sort((a, b) => sortFn(a, b) * factor);
        }
        if (activeSortKey && sortOptions) {
            const selectedOption = sortOptions.find((opt) => opt.key === activeSortKey);
            if (selectedOption === null || selectedOption === void 0 ? void 0 : selectedOption.compare) {
                return list.sort((a, b) => selectedOption.compare(a, b) * factor);
            }
        }
        if (activeSortKey) {
            return list.sort((a, b) => {
                const valA = a[activeSortKey];
                const valB = b[activeSortKey];
                if (typeof valA === "number" && typeof valB === "number") {
                    return (valA - valB) * factor;
                }
                return String(valA !== null && valA !== void 0 ? valA : "").localeCompare(String(valB !== null && valB !== void 0 ? valB : ""), undefined, { numeric: true }) * factor;
            });
        }
        return list;
    }, [filteredItems, sortable, sortFn, activeSortKey, activeSortDirection, sortOptions]);
    const totalItems = processedItems.length;
    const resultKey = `${totalItems}|${deferredSearchQuery}|${activeSortKey}|${activeSortDirection}`;
    const visibleReorderNote = reorderNote && reorderNote.key === resultKey ? reorderNote.text : "";
    const totalPages = Math.max(1, Math.ceil(totalItems / activePageSize));
    const currentPage = Math.min(Math.max(1, activePage), totalPages);
    // The reorder announcement describes the previous result set; drop it as soon
    // as filtering/sorting changes what the positions refer to.
    const paginatedItems = useMemo(() => {
        if (mode !== "paginated")
            return processedItems;
        const start = (currentPage - 1) * activePageSize;
        return processedItems.slice(start, start + activePageSize);
    }, [mode, processedItems, currentPage, activePageSize]);
    const [responsiveColumns, setResponsiveColumns] = useState(() => {
        var _a, _b, _c;
        if (typeof columns === "number")
            return columns;
        return (_c = (_b = (_a = columns.lg) !== null && _a !== void 0 ? _a : columns.md) !== null && _b !== void 0 ? _b : columns.sm) !== null && _c !== void 0 ? _c : 3;
    });
    const activeColumns = typeof columns === "number" ? columns : responsiveColumns;
    useEffect(() => {
        if (typeof columns === "number")
            return;
        const updateCols = () => {
            var _a, _b;
            const width = (_b = (_a = listContainerRef.current) === null || _a === void 0 ? void 0 : _a.clientWidth) !== null && _b !== void 0 ? _b : (typeof window !== "undefined" ? window.innerWidth : 1024);
            if (width >= 1280 && columns.xl)
                setResponsiveColumns(columns.xl);
            else if (width >= 1024 && columns.lg)
                setResponsiveColumns(columns.lg);
            else if (width >= 768 && columns.md)
                setResponsiveColumns(columns.md);
            else if (columns.sm)
                setResponsiveColumns(columns.sm);
            else
                setResponsiveColumns(1);
        };
        updateCols();
        if (typeof ResizeObserver === "undefined")
            return;
        const element = listContainerRef.current;
        if (!element)
            return;
        const observer = new ResizeObserver(updateCols);
        observer.observe(element);
        return () => observer.disconnect();
    }, [columns]);
    const virtualRows = useMemo(() => {
        if (mode !== "virtual" || layout !== "grid")
            return [];
        return chunkArray(processedItems, activeColumns);
    }, [mode, layout, processedItems, activeColumns]);
    const handleSelectAll = useCallback(() => {
        const newSet = new Set(selectedKeySet);
        processedItems.forEach((item, idx) => {
            const key = getItemKey(item, idx);
            const disabled = isItemDisabled ? isItemDisabled(item, idx) : false;
            if (!disabled)
                newSet.add(key);
        });
        updateSelection(newSet, processedItems);
    }, [processedItems, selectedKeySet, getItemKey, isItemDisabled, updateSelection]);
    const handleClearSelection = useCallback(() => {
        updateSelection(new Set(), processedItems);
    }, [processedItems, updateSelection]);
    // Single-item reorder with final-index semantics: the consumer owns `items` and
    // applies the move. The active index follows the moved row and the move is
    // announced politely (SC 4.1.3).
    const handleReorderMove = useCallback((from, to) => {
        if (!onReorder || from === to)
            return;
        setActiveIndex(to);
        onReorder({ from, to });
        setReorderNote({
            text: `Moved item from position ${from + 1} to position ${to + 1}`,
            key: resultKey,
        });
    }, [onReorder, resultKey]);
    const handleToggleItemSelection = useCallback((item, index) => {
        const key = getItemKey(item, index);
        const disabled = isItemDisabled ? isItemDisabled(item, index) : false;
        if (disabled)
            return;
        const newSet = new Set(selectedKeySet);
        if (selectionMode === "single") {
            if (newSet.has(key)) {
                newSet.clear();
            }
            else {
                newSet.clear();
                newSet.add(key);
            }
        }
        else if (selectionMode === "multiple") {
            if (newSet.has(key)) {
                newSet.delete(key);
            }
            else {
                newSet.add(key);
            }
        }
        updateSelection(newSet, processedItems);
    }, [getItemKey, isItemDisabled, selectedKeySet, selectionMode, updateSelection, processedItems]);
    useImperativeHandle(listRef, () => ({
        scrollToIndex: (index) => {
            var _a, _b;
            if (mode === "virtual") {
                if (layout === "grid") {
                    const rowIndex = Math.floor(index / activeColumns);
                    (_a = virtualListRef.current) === null || _a === void 0 ? void 0 : _a.scrollToIndex(rowIndex);
                }
                else {
                    (_b = virtualListRef.current) === null || _b === void 0 ? void 0 : _b.scrollToIndex(index);
                }
            }
        },
        scrollToOffset: (offset) => {
            var _a;
            if (mode === "virtual") {
                (_a = virtualListRef.current) === null || _a === void 0 ? void 0 : _a.scrollToOffset(offset);
            }
            else if (listContainerRef.current) {
                listContainerRef.current.scrollTop = offset;
            }
        },
        getScrollElement: () => {
            var _a, _b;
            if (mode === "virtual") {
                return (_b = (_a = virtualListRef.current) === null || _a === void 0 ? void 0 : _a.getScrollElement()) !== null && _b !== void 0 ? _b : null;
            }
            return listContainerRef.current;
        },
        clearSelection: handleClearSelection,
        selectAll: handleSelectAll,
    }), [mode, layout, activeColumns, handleClearSelection, handleSelectAll]);
    useEffect(() => {
        if (mode !== "infinite" || !hasMore || isLoadingMore || !onLoadMore)
            return;
        const sentinel = sentinelRef.current;
        if (!sentinel)
            return;
        const observer = new IntersectionObserver((entries) => {
            var _a;
            if ((_a = entries[0]) === null || _a === void 0 ? void 0 : _a.isIntersecting) {
                onLoadMore();
            }
        }, {
            root: null,
            rootMargin: `${scrollThresholdPx}px`,
            threshold: 0.1,
        });
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [mode, hasMore, isLoadingMore, onLoadMore, scrollThresholdPx]);
    const resolvedContainerRole = customRole !== null && customRole !== void 0 ? customRole : (mode === "infinite" ? "feed" : selectionMode !== "none" ? "listbox" : "list");
    const resolvedItemRole = customItemRole !== null && customItemRole !== void 0 ? customItemRole : (resolvedContainerRole === "feed"
        ? "article"
        : resolvedContainerRole === "listbox"
            ? "option"
            : resolvedContainerRole === "grid"
                ? "row"
                : "listitem");
    const getItemIdResolved = useCallback((index) => { var _a; return (_a = getItemId === null || getItemId === void 0 ? void 0 : getItemId(index)) !== null && _a !== void 0 ? _a : `${generatedId}-item-${index}`; }, [getItemId, generatedId]);
    const handleContainerKeyDown = useCallback((event) => {
        if (!interactive || processedItems.length === 0)
            return;
        const count = processedItems.length;
        // Reorder keyboard path (SC 2.1.1): Alt+Arrow moves the active row itself.
        if (onReorder && event.altKey && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
            event.preventDefault();
            const delta = event.key === "ArrowUp" ? -1 : 1;
            const from = activeIndex;
            const to = from + delta;
            if (from >= 0 && from < count && to >= 0 && to < count) {
                handleReorderMove(from, to);
            }
            return;
        }
        let delta = 0;
        switch (event.key) {
            case "ArrowDown":
                delta = layout === "grid" ? activeColumns : 1;
                break;
            case "ArrowUp":
                delta = layout === "grid" ? -activeColumns : -1;
                break;
            case "ArrowRight":
                delta = 1;
                break;
            case "ArrowLeft":
                delta = -1;
                break;
            case "Home":
                event.preventDefault();
                setActiveIndex(0);
                return;
            case "End":
                event.preventDefault();
                setActiveIndex(count - 1);
                return;
            case "Enter":
            case " ":
                if (activeIndex >= 0 && activeIndex < count) {
                    event.preventDefault();
                    const currentItem = processedItems[activeIndex];
                    if (selectionMode !== "none") {
                        handleToggleItemSelection(currentItem, activeIndex);
                    }
                    onItemClick === null || onItemClick === void 0 ? void 0 : onItemClick(currentItem, activeIndex);
                }
                return;
            default:
                return;
        }
        if (delta !== 0) {
            event.preventDefault();
            setActiveIndex((prev) => Math.max(0, Math.min(count - 1, prev + delta)));
        }
    }, [
        interactive,
        processedItems,
        layout,
        activeColumns,
        activeIndex,
        selectionMode,
        handleToggleItemSelection,
        onItemClick,
        onReorder,
        handleReorderMove,
    ]);
    const selectedCount = selectedKeySet.size;
    const handleJumpSubmit = (e) => {
        e.preventDefault();
        const targetPage = Number.parseInt(jumpPageInput, 10);
        if (!Number.isNaN(targetPage)) {
            handlePageChange(Math.max(1, Math.min(totalPages, targetPage)));
            setJumpPageInput("");
        }
    };
    const renderSkeletonItems = () => {
        const count = skeletonCount;
        const skeletons = [];
        for (let i = 0; i < count; i++) {
            skeletons.push(_jsx("div", { className: cn("rounded-xl border border-border/50 bg-surface/50 p-4 animate-pulse", layout === "grid" ? "h-44" : "h-20"), children: renderSkeleton ? (renderSkeleton(i)) : (_jsxs(VStack, { spacing: "md", children: [_jsxs(HStack, { spacing: "md", children: [_jsx("div", { className: "size-10 rounded-full bg-muted-foreground/20 shrink-0" }), _jsxs("div", { className: "flex flex-col gap-2 w-full", children: [_jsx("div", { className: "h-4 w-1/3 rounded bg-muted-foreground/20" }), _jsx("div", { className: "h-3 w-1/2 rounded bg-muted-foreground/15" })] })] }), _jsx("div", { className: "h-3 w-4/5 rounded bg-muted-foreground/10" })] })) }, `skeleton-${i}`));
        }
        return skeletons;
    };
    const columnTemplate = tableColumns ? `repeat(${tableColumns.length}, minmax(0, 1fr))` : undefined;
    const renderRow = useCallback((item, state) => {
        var _a;
        if (!tableColumns)
            return (_a = renderItem === null || renderItem === void 0 ? void 0 : renderItem(item, state)) !== null && _a !== void 0 ? _a : null;
        return (_jsx("div", { className: "grid items-center gap-3", style: { gridTemplateColumns: columnTemplate }, children: tableColumns.map((column) => (_jsxs("div", { className: cn("min-w-0 truncate", column.align === "end" ? "text-end" : "text-start", column.numeric && "tabular-nums"), children: [_jsxs("span", { className: "sr-only", children: [column.header, ": "] }), column.cell(item, state.index)] }, column.key))) }));
    }, [tableColumns, renderItem, columnTemplate]);
    // Row chrome: content plus the trailing overflow-menu trigger. The trigger is a
    // real tab stop (SC 2.1.1) and an icon-only Button, so its 44px coarse-pointer
    // target (SC 2.5.8) and accessible name (SC 4.1.2) come from Button. Opening the
    // menu never bubbles into the row's own click (selection / onItemClick).
    const renderRowChrome = useCallback((item, index, content, total) => {
        const actions = rowActions ? rowActions(item, index) : [];
        const canReorder = onReorder !== undefined && total > 1;
        if (actions.length === 0 && !canReorder)
            return content;
        const disabled = isItemDisabled ? isItemDisabled(item, index) : false;
        if (disabled)
            return content;
        return (_jsxs("div", { className: "flex w-full items-start gap-2", children: [_jsx("div", { className: "min-w-0 flex-1", children: content }), _jsxs(DropdownMenu, { children: [_jsx(DropdownMenuTrigger, { children: _jsx(Button, { variant: "ghost", size: "sm", iconOnly: true, tooltip: rowActionsLabel, onClick: (e) => e.stopPropagation(), className: "shrink-0", children: _jsx(Ellipsis, { className: "size-4" }) }) }), _jsxs(DropdownMenuContent, { align: "end", children: [actions.map((action) => (_jsx(DropdownMenuItem, { variant: action.destructive ? "danger" : "default", icon: action.icon, disabled: action.disabled, onClick: (e) => {
                                        e.stopPropagation();
                                        action.onSelect(item, index);
                                    }, children: action.label }, action.key))), canReorder && actions.length > 0 && _jsx(DropdownMenuSeparator, {}), canReorder && (_jsxs(_Fragment, { children: [_jsx(DropdownMenuItem, { icon: _jsx(ArrowUp, { className: "size-4" }), disabled: index <= 0, onClick: (e) => {
                                                e.stopPropagation();
                                                handleReorderMove(index, index - 1);
                                            }, children: "Move up" }), _jsx(DropdownMenuItem, { icon: _jsx(ArrowDown, { className: "size-4" }), disabled: index >= total - 1, onClick: (e) => {
                                                e.stopPropagation();
                                                handleReorderMove(index, index + 1);
                                            }, children: "Move down" })] }))] })] })] }));
    }, [rowActions, rowActionsLabel, onReorder, isItemDisabled, handleReorderMove]);
    const renderVirtualGridRow = useCallback((rowItems, rowState) => {
        return (
        // Raw grid: the template and gap are computed from `activeColumns` and the
        // `gap` prop at runtime, which `Grid`'s fixed tiers cannot express.
        _jsx("div", { className: "grid w-full h-full", style: {
                gridTemplateColumns: `repeat(${activeColumns}, minmax(0, 1fr))`,
                gap: typeof gap === "number" ? `${gap}px` : gap,
            }, children: rowItems.map((item, colIdx) => {
                const itemIndex = rowState.index * activeColumns + colIdx;
                const key = getItemKey(item, itemIndex);
                const isSelected = selectedKeySet.has(key);
                const disabled = isItemDisabled ? isItemDisabled(item, itemIndex) : false;
                const active = itemIndex === activeIndex;
                return (_jsx("div", { id: getItemIdResolved(itemIndex), "data-index": itemIndex, role: resolvedItemRole, "aria-selected": selectionMode !== "none" ? isSelected : undefined, "aria-disabled": disabled || undefined, "aria-setsize": processedItems.length, "aria-posinset": itemIndex + 1, 
                    // Raw flex: `itemClassName` is consumer-supplied and lands in the same
                    // class string, so a `Stack`'s own alignment classes could collide with it.
                    className: cn("relative h-full flex flex-col", itemClassName, (selectionMode !== "none" || onItemClick) && !disabled && "cursor-pointer"), onClick: () => {
                        if (disabled)
                            return;
                        if (selectionMode !== "none")
                            handleToggleItemSelection(item, itemIndex);
                        onItemClick === null || onItemClick === void 0 ? void 0 : onItemClick(item, itemIndex);
                    }, children: renderRowChrome(item, itemIndex, renderRow(item, {
                        index: itemIndex,
                        selected: isSelected,
                        active,
                        disabled,
                    }), processedItems.length) }, key));
            }) }));
    }, [
        activeColumns,
        gap,
        getItemKey,
        selectedKeySet,
        isItemDisabled,
        activeIndex,
        getItemIdResolved,
        resolvedItemRole,
        selectionMode,
        processedItems.length,
        itemClassName,
        onItemClick,
        renderRow,
        renderRowChrome,
        handleToggleItemSelection,
    ]);
    const renderPaginationControls = () => {
        if (mode !== "paginated" || totalItems === 0)
            return null;
        const startItem = (currentPage - 1) * activePageSize + 1;
        const endItem = Math.min(currentPage * activePageSize, totalItems);
        const getPageNumbers = () => {
            const pages = [];
            const delta = 1;
            const left = currentPage - delta;
            const right = currentPage + delta;
            for (let i = 1; i <= totalPages; i++) {
                if (i === 1 || i === totalPages || (i >= left && i <= right)) {
                    pages.push(i);
                }
                else if (pages[pages.length - 1] !== "ellipsis") {
                    pages.push("ellipsis");
                }
            }
            return pages;
        };
        return (_jsxs(HStack, { as: "nav", role: "navigation", "aria-label": "Pagination", spacing: "lg", wrap: true, justify: "between", className: "border-t border-border/80 pt-4", children: [_jsxs(HStack, { spacing: "md", wrap: true, className: "text-xs text-muted-foreground", children: [_jsxs("span", { children: ["Showing ", _jsx("span", { className: "font-medium text-foreground", children: startItem }), " to", " ", _jsx("span", { className: "font-medium text-foreground", children: endItem }), " of", " ", _jsx("span", { className: "font-medium text-foreground", children: totalItems.toLocaleString() }), " items"] }), showPageSizePicker && (
                        // Raw flex: `gap-1.5` is a half step, off the full-step spacing scale.
                        _jsxs("div", { className: "flex items-center gap-1.5 pl-2 border-l border-border", children: [_jsx("label", { htmlFor: `${generatedId}-page-size`, className: "sr-only", children: "Items per page" }), _jsx("span", { "aria-hidden": "true", children: "Rows:" }), _jsx("select", { id: `${generatedId}-page-size`, value: activePageSize, onChange: (e) => handlePageSizeChange(Number(e.target.value)), "aria-label": "Items per page", className: "focus-ring h-8 pointer-coarse:min-h-11 rounded-md border border-border bg-background px-2 text-xs text-foreground", children: pageSizeOptions.map((opt) => (_jsx("option", { value: opt, children: opt }, opt))) })] }))] }), _jsxs("div", { className: "flex flex-wrap items-center gap-1.5", children: [_jsx(Button, { variant: "outline", size: "sm", iconOnly: true, tooltip: "First page", disabled: currentPage <= 1, onClick: () => handlePageChange(1), children: _jsx(ChevronsLeft, { className: "size-4" }) }), _jsx(Button, { variant: "outline", size: "sm", iconOnly: true, tooltip: "Previous page", disabled: currentPage <= 1, onClick: () => handlePageChange(currentPage - 1), children: _jsx(ChevronLeft, { className: "size-4" }) }), _jsx("div", { className: "hidden sm:flex items-center gap-1", children: getPageNumbers().map((p, idx) => p === "ellipsis" ? (_jsx("span", { className: "px-1.5 text-xs text-muted-foreground", children: "..." }, `ellipsis-${idx}`)) : (_jsx(Button, { variant: currentPage === p ? "primary" : "outline", size: "sm", "aria-current": currentPage === p ? "page" : undefined, "aria-label": `Page ${p}`, onClick: () => handlePageChange(p), className: "min-w-8 px-2.5 text-xs", children: p }, p))) }), _jsx(Button, { variant: "outline", size: "sm", iconOnly: true, tooltip: "Next page", disabled: currentPage >= totalPages, onClick: () => handlePageChange(currentPage + 1), children: _jsx(ChevronRight, { className: "size-4" }) }), _jsx(Button, { variant: "outline", size: "sm", iconOnly: true, tooltip: "Last page", disabled: currentPage >= totalPages, onClick: () => handlePageChange(totalPages), children: _jsx(ChevronsRight, { className: "size-4" }) }), showPageJump && totalPages > 3 && (
                        // Raw flex: `hidden`/`md:flex` is a display toggle, and `gap-1.5` a half step.
                        _jsxs("form", { onSubmit: handleJumpSubmit, className: "hidden md:flex items-center gap-1.5 pl-2 border-l border-border", children: [_jsx("label", { htmlFor: `${generatedId}-page-jump`, className: "text-xs text-muted-foreground", children: "Go to:" }), _jsx("input", { id: `${generatedId}-page-jump`, type: "number", min: 1, max: totalPages, value: jumpPageInput, onChange: (e) => setJumpPageInput(e.target.value), placeholder: `${currentPage}`, className: "focus-ring h-8 w-14 pointer-coarse:min-h-11 rounded-md border border-border bg-background px-2 text-center text-xs text-foreground", "aria-label": `Jump to page between 1 and ${totalPages}` }), _jsx(Button, { type: "submit", variant: "secondary", size: "sm", className: "h-8 px-2 text-xs", children: "Go" })] }))] })] }));
    };
    return (_jsxs(VStack, { ref: listContainerRef, spacing: "md", className: cn("w-full", className), "aria-labelledby": ariaLabelledBy, "aria-describedby": ariaDescribedBy, children: [header, (searchable || sortable || toolbar || (selectionMode === "multiple" && showSelectionToolbar)) && (_jsxs(HStack, { spacing: "md", wrap: true, justify: "between", children: [_jsxs("div", { className: "flex flex-1 flex-wrap items-center gap-3 min-w-60", children: [searchable && (_jsxs("div", { className: "relative flex-1 min-w-44 max-w-sm", children: [_jsx(Search, { className: "pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" }), _jsx("input", { id: searchInputId, type: "search", value: activeSearchQuery, onChange: (e) => handleSearchChange(e.target.value), placeholder: searchPlaceholder, "aria-label": searchPlaceholder, "aria-describedby": statusRegionId, className: "focus-ring h-9 w-full pointer-coarse:min-h-11 rounded-lg border border-border bg-background pl-9 pr-8 text-xs text-foreground transition-colors hover:border-muted-foreground/60 placeholder:text-muted-foreground" }), activeSearchQuery && (_jsx("button", { type: "button", onClick: () => handleSearchChange(""), "aria-label": "Clear search", className: "focus-ring absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground", children: _jsx(X, { className: "size-3.5" }) }))] })), sortable && sortOptions && sortOptions.length > 0 && (_jsxs(HStack, { spacing: "xs", children: [_jsx("label", { htmlFor: `${generatedId}-sort`, className: "sr-only", children: "Sort by" }), _jsx("select", { id: `${generatedId}-sort`, value: activeSortKey, onChange: (e) => handleSortChange(e.target.value, activeSortDirection), "aria-label": "Sort list by", className: "focus-ring h-9 pointer-coarse:min-h-11 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground", children: sortOptions.map((opt) => (_jsxs("option", { value: opt.key, children: ["Sort: ", opt.label] }, opt.key))) }), _jsx(Button, { variant: "outline", size: "sm", iconOnly: true, tooltip: `Sort direction: ${activeSortDirection === "asc" ? "Ascending" : "Descending"}`, onClick: toggleSortDirection, className: "h-9 w-9", children: activeSortDirection === "asc" ? (_jsx(ArrowUp, { className: "size-3.5 text-primary-800 dark:text-primary-300" })) : (_jsx(ArrowDown, { className: "size-3.5 text-primary-800 dark:text-primary-300" })) })] })), toolbar] }), selectionMode === "multiple" && showSelectionToolbar && (_jsxs(HStack, { spacing: "sm", className: "rounded-lg bg-surface px-3 py-1.5 border border-border text-xs", children: [_jsx("span", { className: "font-medium text-foreground", children: selectedCount > 0 ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "text-primary-800 dark:text-primary-300 font-semibold", children: selectedCount }), " of", " ", processedItems.length, " selected"] })) : ("0 selected") }), _jsx("div", { className: "h-4 w-px bg-border" }), _jsx(Button, { variant: "ghost", size: "sm", className: "h-7 px-2 text-xs", onClick: handleSelectAll, disabled: processedItems.length === 0 || selectedCount === processedItems.length, children: "Select all" }), selectedCount > 0 && (_jsx(Button, { variant: "ghost", size: "sm", className: "h-7 px-2 text-xs text-muted-foreground hover:text-foreground", onClick: handleClearSelection, children: "Clear" }))] }))] })), _jsx("span", { id: statusRegionId, role: "status", "aria-live": "polite", className: "sr-only", children: loading
                    ? "Loading list items..."
                    : (visibleReorderNote ||
                        `${processedItems.length} items available${activeSearchQuery ? ` matching "${activeSearchQuery}"` : ""}`) }), (paginationPlacement === "top" || paginationPlacement === "both") && renderPaginationControls(), tableColumns && showColumnHeaders && (_jsx("div", { "aria-hidden": "true", className: "grid items-center gap-3 px-1 text-xs font-medium text-muted-foreground", style: { gridTemplateColumns: columnTemplate }, children: tableColumns.map((column) => (_jsx("div", { className: cn("min-w-0 truncate", column.align === "end" ? "text-end" : "text-start", column.numeric && "tabular-nums"), children: column.header }, column.key))) })), loading ? (loadingState !== null && loadingState !== void 0 ? loadingState : (_jsxs(VStack, { spacing: "md", align: "center", justify: "center", className: "h-48 w-full text-muted-foreground", children: [_jsx(Loader2, { className: "size-7 animate-spin text-primary-500" }), _jsx("span", { className: "text-sm", children: "Loading items..." })] }))) : processedItems.length === 0 ? (emptyState !== null && emptyState !== void 0 ? emptyState : (_jsxs(VStack, { spacing: "sm", align: "center", justify: "center", inset: "xl", className: "h-48 w-full rounded-xl border border-dashed border-border bg-surface/30 text-center", children: [_jsx("span", { className: "text-sm font-medium text-foreground", children: emptyMessage }), activeSearchQuery && (_jsx(Button, { variant: "outline", size: "sm", onClick: () => handleSearchChange(""), className: "mt-2 text-xs", children: "Clear filter" }))] }))) : mode === "virtual" ? (
            /* VIRTUAL MODE */
            layout === "grid" ? (_jsx(VirtualList, { listRef: virtualListRef, items: virtualRows, itemHeight: typeof itemHeight === "number"
                    ? itemHeight
                    : DEFAULT_ITEM_HEIGHT_GRID, height: height, overscan: overscan, dynamic: dynamic, role: toVirtualRole(resolvedContainerRole), itemRole: "presentation", "aria-label": ariaLabel, "aria-labelledby": ariaLabelledBy, "aria-describedby": ariaDescribedBy, interactive: interactive, className: cn("focus-ring rounded-xl border border-border bg-background p-3", listClassName), renderItem: renderVirtualGridRow, getItemKey: (_, rowIdx) => `row-${rowIdx}` })) : (_jsx(VirtualList, { listRef: virtualListRef, items: processedItems, itemHeight: typeof itemHeight === "function"
                    ? (idx) => itemHeight(idx, processedItems[idx])
                    : typeof itemHeight === "number"
                        ? itemHeight
                        : DEFAULT_ITEM_HEIGHT_LIST, height: height, overscan: overscan, dynamic: dynamic, role: toVirtualRole(resolvedContainerRole), itemRole: toVirtualItemRole(resolvedItemRole), "aria-label": ariaLabel, "aria-labelledby": ariaLabelledBy, "aria-describedby": ariaDescribedBy, interactive: interactive, getItemKey: getItemKey, getItemId: getItemIdResolved, isItemDisabled: isItemDisabled, isItemSelected: (item, idx) => selectedKeySet.has(getItemKey(item, idx)), onItemSelect: (item, idx) => {
                    if (selectionMode !== "none")
                        handleToggleItemSelection(item, idx);
                    onItemClick === null || onItemClick === void 0 ? void 0 : onItemClick(item, idx);
                }, onVisibleRangeChange: onVisibleRangeChange, className: cn("focus-ring rounded-xl border border-border bg-background p-2", listClassName), itemClassName: cn("px-1 py-1 transition-colors data-[active]:bg-primary-500/8 dark:data-[active]:bg-primary-400/15 hover:bg-primary-500/8 dark:hover:bg-primary-400/15", (selectionMode !== "none" || onItemClick) && "cursor-pointer", itemClassName), renderItem: (item, state) => renderRowChrome(item, state.index, renderRow(item, {
                    index: state.index,
                    selected: state.selected,
                    active: state.active,
                    disabled: state.disabled,
                }), processedItems.length) }))) : mode === "paginated" ? (
            /* PAGINATED MODE. Raw flex/grid: `layout` flips display at runtime, the grid
               template comes from `activeColumns`, and the list gap is a half step. */
            _jsx("div", { role: resolvedContainerRole, "aria-label": ariaLabel, "aria-labelledby": ariaLabelledBy, "aria-describedby": ariaDescribedBy, "aria-multiselectable": selectionMode === "multiple" || undefined, tabIndex: interactive ? 0 : undefined, onKeyDown: handleContainerKeyDown, className: cn("focus-ring", layout === "grid"
                    ? "grid gap-4"
                    : "flex flex-col gap-2.5", listClassName), style: layout === "grid"
                    ? {
                        gridTemplateColumns: `repeat(${activeColumns}, minmax(0, 1fr))`,
                        gap: typeof gap === "number" ? `${gap}px` : gap,
                    }
                    : undefined, children: paginatedItems.map((item, localIdx) => {
                    const globalIndex = (currentPage - 1) * activePageSize + localIdx;
                    const key = getItemKey(item, globalIndex);
                    const isSelected = selectedKeySet.has(key);
                    const disabled = isItemDisabled ? isItemDisabled(item, globalIndex) : false;
                    const active = globalIndex === activeIndex;
                    return (_jsx("div", { id: getItemIdResolved(globalIndex), "data-index": globalIndex, "data-active": active || undefined, role: resolvedItemRole, "aria-selected": selectionMode !== "none" ? isSelected : undefined, "aria-disabled": disabled || undefined, "aria-setsize": totalItems, "aria-posinset": globalIndex + 1, className: cn("relative rounded-xl transition-all data-[active]:bg-primary-500/8 dark:data-[active]:bg-primary-400/15 hover:bg-primary-500/8 dark:hover:bg-primary-400/15", (selectionMode !== "none" || onItemClick) && !disabled && "cursor-pointer", active && "ring-2 ring-primary-500/50", isSelected && "bg-primary-500/10 dark:bg-primary-500/15", itemClassName), onClick: () => {
                            if (disabled)
                                return;
                            if (selectionMode !== "none")
                                handleToggleItemSelection(item, globalIndex);
                            onItemClick === null || onItemClick === void 0 ? void 0 : onItemClick(item, globalIndex);
                        }, children: renderRowChrome(item, globalIndex, renderRow(item, {
                            index: globalIndex,
                            selected: isSelected,
                            active,
                            disabled,
                        }), totalItems) }, key));
                }) })) : (
            /* INFINITE SCROLL MODE. Raw flex/grid for the same runtime reasons as the
               paginated container above. */
            _jsxs("div", { role: resolvedContainerRole, "aria-label": ariaLabel, "aria-labelledby": ariaLabelledBy, "aria-describedby": ariaDescribedBy, "aria-busy": isLoadingMore || undefined, "aria-multiselectable": selectionMode === "multiple" || undefined, tabIndex: interactive ? 0 : undefined, onKeyDown: handleContainerKeyDown, className: cn("focus-ring", layout === "grid"
                    ? "grid gap-4"
                    : "flex flex-col gap-2.5", listClassName), style: layout === "grid"
                    ? {
                        gridTemplateColumns: `repeat(${activeColumns}, minmax(0, 1fr))`,
                        gap: typeof gap === "number" ? `${gap}px` : gap,
                    }
                    : undefined, children: [processedItems.map((item, index) => {
                        const key = getItemKey(item, index);
                        const isSelected = selectedKeySet.has(key);
                        const disabled = isItemDisabled ? isItemDisabled(item, index) : false;
                        const active = index === activeIndex;
                        return (_jsx("div", { id: getItemIdResolved(index), "data-index": index, "data-active": active || undefined, role: resolvedItemRole, "aria-selected": selectionMode !== "none" ? isSelected : undefined, "aria-disabled": disabled || undefined, "aria-setsize": hasMore ? -1 : processedItems.length, "aria-posinset": index + 1, className: cn("relative rounded-xl transition-all data-[active]:bg-primary-500/8 dark:data-[active]:bg-primary-400/15 hover:bg-primary-500/8 dark:hover:bg-primary-400/15", (selectionMode !== "none" || onItemClick) && !disabled && "cursor-pointer", active && "ring-2 ring-primary-500/50", isSelected && "bg-primary-500/10 dark:bg-primary-500/15", itemClassName), onClick: () => {
                                if (disabled)
                                    return;
                                if (selectionMode !== "none")
                                    handleToggleItemSelection(item, index);
                                onItemClick === null || onItemClick === void 0 ? void 0 : onItemClick(item, index);
                            }, children: renderRowChrome(item, index, renderRow(item, {
                                index,
                                selected: isSelected,
                                active,
                                disabled,
                            }), processedItems.length) }, key));
                    }), isLoadingMore && renderSkeletonItems(), hasMore && !isLoadingMore && (_jsx("div", { ref: sentinelRef, className: "h-6 w-full opacity-0", "aria-hidden": "true" })), !hasMore && processedItems.length > 0 && (_jsxs("div", { className: "col-span-full py-4 text-center text-xs text-muted-foreground border-t border-border/50", children: ["All ", processedItems.length.toLocaleString(), " items loaded"] }))] })), (paginationPlacement === "bottom" || paginationPlacement === "both") && renderPaginationControls(), footer] }));
}
