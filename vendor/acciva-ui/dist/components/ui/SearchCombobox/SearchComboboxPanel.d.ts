import type { RefObject } from "react";
import type { VirtualListHandle } from "../VirtualList/index.js";
import type { SearchComboboxOption } from "./types.js";
interface SearchComboboxPanelProps {
    items: readonly SearchComboboxOption[];
    query: string;
    activeIndex: number;
    optionHeight: number;
    maxListHeight: number;
    listRef: RefObject<VirtualListHandle | null>;
    listboxId: string;
    listLabel: string | undefined;
    optionId: (index: number) => string;
    emptyMessage: string;
    onCommit: (index: number) => void;
    onHover: (index: number) => void;
}
export declare function SearchComboboxPanel({ query, activeIndex, onHover, ...panel }: SearchComboboxPanelProps): import("react").JSX.Element;
export {};
