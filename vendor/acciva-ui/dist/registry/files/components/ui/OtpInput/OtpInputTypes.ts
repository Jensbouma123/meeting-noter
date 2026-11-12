import type { HTMLAttributes } from "react";
import type { ResponsiveSize, SizeTier } from "@/lib/sizing-tokens/index";

export type OtpInputType = "numeric" | "alphanumeric";

export interface OtpInputProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue"> {
  length?: number;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onComplete?: (value: string) => void;
  type?: OtpInputType;
  disabled?: boolean;
  readOnly?: boolean;
  autoFocus?: boolean;
  label?: string;
  hint?: string;
  error?: string;
  size?: ResponsiveSize<SizeTier>;
  mask?: boolean;
  "aria-describedby"?: string;
}
