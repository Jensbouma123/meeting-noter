import { type SelectOption } from "../ui/Select/index.js";
export interface FilterBarProps {
    searchValue: string;
    onSearchChange: (value: string) => void;
    sortOptions: SelectOption[];
    sortValue: string | null;
    onSortChange: (value: string) => void;
    activeFilters?: string[];
    onRemoveFilter?: (filter: string) => void;
    onOpenFilters?: () => void;
}
export declare function FilterBar({ searchValue, onSearchChange, sortOptions, sortValue, onSortChange, activeFilters, onRemoveFilter, onOpenFilters, }: FilterBarProps): import("react").JSX.Element;
