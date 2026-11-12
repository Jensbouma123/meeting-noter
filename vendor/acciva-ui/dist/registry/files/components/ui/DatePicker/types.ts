import type { ReactNode } from "react";
import type { useArrowHint } from "@/lib/use-arrow-hint";
import type { ResponsiveSize, SizeTier } from "@/lib/sizing-tokens/index";

export type CalendarViewMode = "day" | "month" | "year" | "decade";

export type DatePickerGridHint = ReturnType<typeof useArrowHint>;

export interface DatePickerPreset {
  label: string;
  value: Date;
}

export interface DatePickerProps {
  value?: Date | string | null;
  defaultValue?: Date | string | null;
  onChange?: (date: Date | null) => void;
  placeholder?: string;
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  clearable?: boolean;
  minDate?: Date | string;
  maxDate?: Date | string;
  disabledDates?: ((date: Date) => boolean) | Date[];
  presets?: readonly DatePickerPreset[];
  showPresets?: boolean;
  formatDate?: (date: Date) => string;
  size?: ResponsiveSize<SizeTier>;
  className?: string;
  id?: string;
  name?: string;
  closeOnSelect?: boolean;
  leadingIcon?: ReactNode;
  "aria-describedby"?: string;
  /** First-keyboard-focus caption for the date grid; `false` disables it. */
  arrowHint?: string | false;
}
