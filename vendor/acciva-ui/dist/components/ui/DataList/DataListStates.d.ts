export declare function DataListLoading(): import("react").JSX.Element;
interface DataListEmptyProps {
    message: string;
    searchQuery: string;
    onClearSearch: () => void;
}
export declare function DataListEmpty({ message, searchQuery, onClearSearch }: DataListEmptyProps): import("react").JSX.Element;
export {};
