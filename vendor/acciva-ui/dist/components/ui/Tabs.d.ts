import { type ReactNode } from "react";
import { type ResponsiveSize, type SizeTier } from "../../lib/sizing-tokens.js";
export type TabsVariant = "pill" | "underline";
export type TabsOrientation = "horizontal" | "vertical";
export interface TabsProps {
    value: string;
    onValueChange: (value: string) => void;
    children: ReactNode;
    className?: string;
    size?: ResponsiveSize<SizeTier>;
    variant?: TabsVariant;
    orientation?: TabsOrientation;
}
export declare function Tabs({ value, onValueChange, children, className, size, variant, orientation, }: TabsProps): import("react").JSX.Element;
export interface TabListProps {
    children: ReactNode;
    className?: string;
    "aria-label"?: string;
    "aria-labelledby"?: string;
}
export declare function TabList({ children, className, "aria-label": ariaLabel, "aria-labelledby": ariaLabelledBy, }: TabListProps): import("react").JSX.Element;
export interface TabProps {
    value: string;
    children: ReactNode;
    disabled?: boolean;
    className?: string;
}
export declare function Tab({ value, children, disabled, className }: TabProps): import("react").JSX.Element;
/**
 * The panel element stays mounted while inactive so the owning tab's
 * `aria-controls` always resolves; only its subtree is torn down. `hidden`
 * keeps the idle panel out of the accessibility tree and the tab order.
 */
export declare function TabPanel({ value, children, className }: {
    value: string;
    children: ReactNode;
    className?: string;
}): import("react").JSX.Element;
