import { type ReactNode } from "react";
import type { ResponsiveSize, SizeTier } from "../../../lib/sizing-tokens/index.js";
import type { TabsOrientation, TabsVariant } from "./types.js";
export interface TabsProps {
    value: string;
    onValueChange: (value: string) => void;
    children: ReactNode;
    className?: string;
    size?: ResponsiveSize<SizeTier>;
    variant?: TabsVariant;
    orientation?: TabsOrientation;
    /** Horizontal only: a drag starting on the selected tab slides the selection. */
    draggable?: boolean;
}
export declare function Tabs({ value, onValueChange, children, className, size, variant, orientation, draggable, }: TabsProps): import("react").JSX.Element;
