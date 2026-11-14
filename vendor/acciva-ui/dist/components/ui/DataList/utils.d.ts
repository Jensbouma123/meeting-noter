import type { KeyboardEvent } from "react";
import type { VirtualListItemRole, VirtualListRole } from "../VirtualList/index.js";
import type { DataListItemRole, DataListMode, DataListRole, DataListSelectionMode, DataListTableColumn } from "./types.js";
export declare const DEFAULT_PAGE_SIZE_OPTIONS: number[];
export declare const DEFAULT_VIRTUAL_HEIGHT = 480;
export declare const DEFAULT_ITEM_HEIGHT_LIST = 72;
export declare const DEFAULT_ITEM_HEIGHT_GRID = 200;
/** True when a keydown came from a control nested inside the container; that control keeps the key. */
export declare function isFromNestedControl(event: KeyboardEvent<HTMLElement>): boolean;
export declare function defaultKeyExtractor<T>(item: T, index: number): string | number;
export declare function extractItemSearchString<T>(item: T, keys?: (keyof T | ((item: T) => string))[]): string;
export declare function chunkArray<T>(array: readonly T[], size: number): T[][];
export declare function toVirtualRole(role: DataListRole): VirtualListRole;
export declare function toVirtualItemRole(itemRole: DataListItemRole): VirtualListItemRole;
export declare function resolveContainerRole(customRole: DataListRole | undefined, mode: DataListMode, selectionMode: DataListSelectionMode): DataListRole;
export declare function resolveItemRole(customItemRole: DataListItemRole | undefined, containerRole: DataListRole): DataListItemRole;
export declare function getPageNumbers(currentPage: number, totalPages: number): (number | "ellipsis")[];
export declare function columnCellClass<T>(column: DataListTableColumn<T>): string;
