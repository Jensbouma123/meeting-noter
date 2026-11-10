interface DataListPageButtonsProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}
export declare function DataListPageButtons({ currentPage, totalPages, onPageChange }: DataListPageButtonsProps): import("react").JSX.Element;
export {};
