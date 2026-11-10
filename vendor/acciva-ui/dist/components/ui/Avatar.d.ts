import { type HTMLAttributes, type ReactNode } from "react";
export type AvatarSize = "sm" | "md" | "lg";
export interface AvatarProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
    src?: string;
    name?: string;
    size?: AvatarSize;
    fallback?: ReactNode;
}
export declare function Avatar({ src, name, size, fallback, className, ...props }: AvatarProps): import("react").JSX.Element;
