import { type ReactNode } from "react";
export interface TabListProps {
    children: ReactNode;
    className?: string;
    "aria-label"?: string;
    "aria-labelledby"?: string;
}
export declare function TabList({ children, className, "aria-label": ariaLabel, "aria-labelledby": ariaLabelledBy, }: TabListProps): import("react").JSX.Element;
