import type { SocialProvider } from "@/components/ui/SocialButton/SocialButtonTypes";

export const PROVIDER_DISPLAY_NAMES: Record<SocialProvider, string> = {
  google: "Google",
  apple: "Apple",
  github: "GitHub",
  microsoft: "Microsoft",
};

export const DEFAULT_LABELS: Record<SocialProvider, string> = {
  google: "Sign in with Google",
  apple: "Sign in with Apple",
  github: "Sign in with GitHub",
  microsoft: "Sign in with Microsoft",
};
