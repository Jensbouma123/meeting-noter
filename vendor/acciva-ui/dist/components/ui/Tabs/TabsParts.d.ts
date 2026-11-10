import { type ReactNode } from "react";
export interface TabProps {
    value: string;
    children: ReactNode;
    disabled?: boolean;
    className?: string;
}
export declare function Tab({ value, children, disabled, className }: TabProps): import("react").JSX.Element;
export declare function TabPanel({ value, children, className }: {
    value: string;
    children: ReactNode;
    className?: string;
}): import("react").JSX.Element;
