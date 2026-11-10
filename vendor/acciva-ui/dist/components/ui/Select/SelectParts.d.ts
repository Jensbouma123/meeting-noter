import { type Dispatch, type RefObject, type SetStateAction } from "react";
import type { SelectOption } from "./types.js";
interface SelectListboxProps {
    listRef: RefObject<HTMLUListElement | null>;
    listId: string;
    baseId: string;
    anchorName: string;
    options: SelectOption[];
    value: string | null;
    activeIndex: number;
    ariaLabel?: string;
    labelledBy?: string;
    onCommit: (index: number) => void;
    onActivate: Dispatch<SetStateAction<number>>;
}
export declare function SelectListbox({ listRef, listId, baseId, anchorName, options, value, activeIndex, ariaLabel, labelledBy, onCommit, onActivate, }: SelectListboxProps): import("react").JSX.Element;
export {};
