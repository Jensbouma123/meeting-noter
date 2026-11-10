import { type HTMLAttributes, type ReactNode } from "react";
export interface DropdownMenuContentProps extends HTMLAttributes<HTMLDivElement> {
    align?: "start" | "center" | "end";
    sideOffset?: number;
    className?: string;
    children?: ReactNode;
    /** First-keyboard-focus caption; `false` disables it. */
    arrowHint?: string | false;
}
export declare const DropdownMenuContent: import("react").ForwardRefExoticComponent<DropdownMenuContentProps & import("react").RefAttributes<HTMLDivElement>>;
