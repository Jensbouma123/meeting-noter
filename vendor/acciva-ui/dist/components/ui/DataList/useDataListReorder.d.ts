import type { DataListProps } from "./DataListProps.js";
export declare function useDataListReorder<T>(props: DataListProps<T>, resultKey: string): {
    activeIndex: number;
    setActiveIndex: import("react").Dispatch<import("react").SetStateAction<number>>;
    handleReorderMove: (from: number, to: number) => void;
    visibleReorderNote: string;
};
