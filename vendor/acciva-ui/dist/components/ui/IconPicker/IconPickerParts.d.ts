import { type IconCategory } from "../../../lib/icon-registry.js";
export declare function SelectedIconPreview({ name }: {
    name: string;
}): import("react").JSX.Element;
export declare function IconCategoryChips({ category, onSelect, }: {
    category: IconCategory | "All";
    onSelect: (option: IconCategory | "All") => void;
}): import("react").JSX.Element;
export declare function IconOptionButton({ name, selected, tabIndex, onFocus, onClick, }: {
    name: string;
    selected: boolean;
    tabIndex: number;
    onFocus: () => void;
    onClick: () => void;
}): import("react").JSX.Element | null;
