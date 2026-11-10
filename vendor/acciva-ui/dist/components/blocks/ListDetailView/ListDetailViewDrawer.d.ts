import type { ListDetailViewProps } from "./ListDetailViewTypes.js";
export interface ListDetailDrawerProps<T> {
    currentItem: T | null | undefined;
    detailTitle: ListDetailViewProps<T>["detailTitle"];
    renderDetail: ListDetailViewProps<T>["renderDetail"];
    onClose: () => void;
}
export declare function ListDetailDrawer<T>({ currentItem, detailTitle, renderDetail, onClose }: ListDetailDrawerProps<T>): import("react").JSX.Element;
