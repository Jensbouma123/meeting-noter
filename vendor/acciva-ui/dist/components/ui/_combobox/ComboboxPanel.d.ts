import { type ReactNode, type RefObject } from "react";
import { type VirtualListHandle, type VirtualListItemState } from "../VirtualList/index.js";
import type { ComboboxItem } from "./types.js";
interface ComboboxPanelProps<T extends ComboboxItem> {
    items: readonly T[];
    selectedValue?: string | null;
    optionHeight: number;
    maxListHeight: number;
    listRef: RefObject<VirtualListHandle | null>;
    listboxId: string;
    /** Id of the element naming the listbox; `listLabel` is the fallback text. */
    labelId?: string;
    listLabel?: string;
    optionId: (index: number) => string;
    emptyMessage: string;
    onCommit: (index: number) => void;
    renderRow: (item: T, state: VirtualListItemState) => ReactNode;
}
/**
 * The popup shared by SearchableSelect and SearchCombobox: a `popover="manual"` top-layer panel
 * (`.select-list`) anchored to the field, holding a virtualized listbox. Focus stays on the input.
 */
export declare function ComboboxPanel<T extends ComboboxItem>({ items, selectedValue, optionHeight, maxListHeight, listRef, listboxId, labelId, listLabel, optionId, emptyMessage, onCommit, renderRow, }: ComboboxPanelProps<T>): import("react").JSX.Element;
export {};
