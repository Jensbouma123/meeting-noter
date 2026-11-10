import type { MouseEvent, ReactElement } from "react";
/** Wraps the element in a tooltip. `tooltip` arrives already gated on a real label. */
export declare function withTooltip(element: ReactElement, tooltip: string | undefined, ownsLongPress: boolean): ReactElement;
export declare function inertClick(event: MouseEvent<HTMLElement>): void;
