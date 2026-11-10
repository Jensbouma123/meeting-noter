interface DataListSearchFieldProps {
    inputId: string;
    query: string;
    placeholder: string;
    statusRegionId: string;
    onQueryChange: (query: string) => void;
}
export declare function DataListSearchField({ inputId, query, placeholder, statusRegionId, onQueryChange, }: DataListSearchFieldProps): import("react").JSX.Element;
export {};
