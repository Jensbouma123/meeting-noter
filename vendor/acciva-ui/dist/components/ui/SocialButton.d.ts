import { type ButtonHTMLAttributes } from "react";
import { type ResponsiveSize, type SizeTier } from "../../lib/sizing-tokens.js";
export type SocialProvider = "google" | "apple" | "github" | "microsoft";
export type SocialButtonVariant = "default" | "light" | "dark" | "neutral" | "black" | "white" | "outline";
export interface SocialButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
    provider: SocialProvider;
    variant?: SocialButtonVariant;
    size?: ResponsiveSize<SizeTier>;
    label?: string;
    labelOverride?: string;
    loading?: boolean;
    fullWidth?: boolean;
}
export declare const SocialButton: import("react").ForwardRefExoticComponent<SocialButtonProps & import("react").RefAttributes<HTMLButtonElement>>;
