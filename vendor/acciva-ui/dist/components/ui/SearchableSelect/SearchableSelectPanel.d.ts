import { type RefObject } from "react";
import { type VirtualListHandle } from "../VirtualList/index.js";
import type { SearchableSelectOption } from "./types.js";
interface SearchableSelectPanelProps {
    items: readonly SearchableSelectOption[];
    value: string | null;
    query: string;
    activeIndex: number;
    optionHeight: number;
    maxListHeight: number;
    listRef: RefObject<VirtualListHandle | null>;
    listboxId: string;
    labelId: string | undefined;
    optionId: (index: number) => string;
    emptyMessage: string;
    onCommit: (index: number) => void;
    onHover: (index: number) => void;
}
export declare function SearchableSelectPanel({ items, value, query, activeIndex, optionHeight, maxListHeight, listRef, listboxId, labelId, optionId, emptyMessage, onCommit, onHover, }: SearchableSelectPanelProps): import("react").JSX.Element;
export {};
