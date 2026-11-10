interface DataListSelectionBarProps {
    selectedCount: number;
    itemCount: number;
    onSelectAll: () => void;
    onClear: () => void;
}
export declare function DataListSelectionBar({ selectedCount, itemCount, onSelectAll, onClear }: DataListSelectionBarProps): import("react").JSX.Element;
export {};
