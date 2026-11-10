import { type HTMLAttributes, type ReactNode } from "react";
import { type ResponsiveSize, type SizeTier } from "../../lib/sizing-tokens.js";
export interface SwitchProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children" | "onChange"> {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    label?: ReactNode;
    disabled?: boolean;
    id?: string;
    size?: ResponsiveSize<SizeTier>;
    /** Merged onto the root wrapper that holds the track and the label. */
    className?: string;
    "aria-label"?: string;
}
export declare function Switch({ checked, onCheckedChange, label, disabled, id, size, className, "aria-label": ariaLabel, ...props }: SwitchProps): import("react").JSX.Element;
