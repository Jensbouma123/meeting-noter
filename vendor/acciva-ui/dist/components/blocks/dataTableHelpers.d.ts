import type { ReactNode } from "react";
import type { DataTableColumn } from "./dataTableTypes.js";
export declare function columnText<T>(column: DataTableColumn<T>, row: T): string;
export declare function compareValues(a: string | number, b: string | number): number;
/** Clamped cells still need the full text for a mouse-hover tooltip since the CSS clamp only hides it visually. */
export declare function clampTitle<T>(column: DataTableColumn<T>, row: T): string | undefined;
export declare function renderCellValue<T>(column: DataTableColumn<T>, row: T): ReactNode;
