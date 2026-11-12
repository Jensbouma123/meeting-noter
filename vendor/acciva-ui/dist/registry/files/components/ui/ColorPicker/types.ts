import type { ButtonHTMLAttributes } from "react";
import type { ColorFormat, HSLA, RGBA } from "@/lib/color/formats/index";
import type { ResponsiveSize, SizeTier } from "@/lib/sizing-tokens/index";

export type { ColorFormat } from "@/lib/color/formats/index";

export interface ColorSwatch {
  value: string;
  label?: string;
}

export interface ColorDetails {
  hex: string;
  rgba: RGBA;
  hsla: HSLA;
}

export interface ColorPickerProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "value" | "defaultValue" | "onChange" | "type" | "children"> {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string, details: ColorDetails) => void;
  format?: ColorFormat;
  allowAlpha?: boolean;
  swatches?: readonly (string | ColorSwatch)[];
  showEyeDropper?: boolean;
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  readOnly?: boolean;
  name?: string;
  size?: ResponsiveSize<SizeTier>;
}
