import { type HTMLAttributes, type ReactNode } from "react";
export type EmptyStateSize = "sm" | "md";
export interface EmptyStateProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
    icon?: ReactNode;
    title: ReactNode;
    description?: ReactNode;
    action?: ReactNode;
    secondaryAction?: ReactNode;
    /**
     * `"sm"` is the dense in-panel treatment, `"md"` the full-page one. It moves
     * padding, icon, and type together, so it is one tier — not a flag.
     */
    size?: EmptyStateSize;
    /**
     * @deprecated Use `size="sm"`. Kept working so no caller breaks; it loses to
     * `size` when both are set and will be removed in a future major.
     */
    compact?: boolean;
}
export declare const EmptyState: import("react").ForwardRefExoticComponent<EmptyStateProps & import("react").RefAttributes<HTMLDivElement>>;
