import type { DataListView } from "./useDataListView.js";
interface DataListArrowHintProps<T> {
    hint: DataListView<T>["listHint"];
}
export declare function DataListArrowHint<T>({ hint }: DataListArrowHintProps<T>): import("react").JSX.Element;
export {};
