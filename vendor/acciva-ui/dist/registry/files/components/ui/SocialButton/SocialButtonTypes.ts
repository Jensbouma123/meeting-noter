import type { ButtonHTMLAttributes } from "react";
import type { ResponsiveSize, SizeTier } from "@/lib/sizing-tokens/index";

export type SocialProvider = "google" | "apple" | "github" | "microsoft";

export type SocialButtonVariant =
  | "default"
  | "light"
  | "dark"
  | "neutral"
  | "black"
  | "white"
  | "outline";

export interface SocialButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  provider: SocialProvider;
  variant?: SocialButtonVariant;
  size?: ResponsiveSize<SizeTier>;
  label?: string;
  labelOverride?: string;
  loading?: boolean;
  fullWidth?: boolean;
}
