import type { ReactNode } from "react";
import type { DataListLayout } from "./types.js";
interface DataListSkeletonItemsProps {
    count: number;
    layout: DataListLayout;
    renderSkeleton?: (index: number) => ReactNode;
}
export declare function DataListSkeletonItems({ count, layout, renderSkeleton }: DataListSkeletonItemsProps): ReactNode[];
export {};
