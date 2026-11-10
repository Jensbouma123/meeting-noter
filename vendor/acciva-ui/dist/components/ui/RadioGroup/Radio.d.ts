import { type HTMLAttributes, type ReactNode } from "react";
export type RadioVariant = "default" | "card";
export interface RadioProps extends Omit<HTMLAttributes<HTMLButtonElement>, "onChange"> {
    value: string;
    label?: ReactNode;
    description?: ReactNode;
    disabled?: boolean;
    /**
     * `"card"` swaps the bare circle-and-label row for a full-width bordered tile.
     * That changes the DOM shape and the hit area, which is a variant, not a flag.
     */
    variant?: RadioVariant;
    /**
     * @deprecated Use `variant="card"`. Kept working so no caller breaks; it loses
     * to `variant` when both are set and will be removed in a future major.
     */
    card?: boolean;
    id?: string;
}
export declare const Radio: import("react").ForwardRefExoticComponent<RadioProps & import("react").RefAttributes<HTMLButtonElement>>;
