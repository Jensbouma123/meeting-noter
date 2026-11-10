import { type HTMLAttributes, type ReactNode } from "react";
export interface BreadcrumbsProps extends HTMLAttributes<HTMLElement> {
    separator?: ReactNode;
    children: ReactNode;
}
export declare const Breadcrumbs: import("react").ForwardRefExoticComponent<BreadcrumbsProps & import("react").RefAttributes<HTMLElement>>;
export interface BreadcrumbItemProps extends HTMLAttributes<HTMLLIElement> {
    href?: string;
    isCurrent?: boolean;
    children: ReactNode;
}
export declare const BreadcrumbItem: import("react").ForwardRefExoticComponent<BreadcrumbItemProps & import("react").RefAttributes<HTMLLIElement>>;
export declare function BreadcrumbSeparator({ children, className }: {
    children?: ReactNode;
    className?: string;
}): import("react").JSX.Element;
