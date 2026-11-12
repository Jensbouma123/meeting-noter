export type IconPickerVariant = "grid" | "dropdown";

export interface IconPickerProps {
  value: string;
  onChange: (name: string) => void;
  variant?: IconPickerVariant;
  /** Accessible name for the `dropdown` variant's combobox. Ignored by `grid`. */
  label?: string;
  className?: string;
}
