import type { KeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
interface SplitPaneSplitterProps {
    widthPx: number;
    label: string;
    onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
    onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
}
export declare function SplitPaneSplitter({ widthPx, label, onKeyDown, onPointerDown, }: SplitPaneSplitterProps): import("react").JSX.Element;
export {};
