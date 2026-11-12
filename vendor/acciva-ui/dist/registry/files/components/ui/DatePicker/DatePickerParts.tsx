import { resolveResponsive, TEXT_SIZE, type ResponsiveSize, type SizeTier } from "@/lib/sizing-tokens/index";
import { cn } from "@/lib/utils";

interface DatePickerLabelProps {
  id: string;
  htmlFor: string;
  label?: string;
  required?: boolean;
  size: ResponsiveSize<SizeTier>;
}

export function DatePickerLabel({ id, htmlFor, label, required, size }: DatePickerLabelProps) {
  if (!label) return null;
  return (
    <label id={id} htmlFor={htmlFor} className={cn("font-medium text-foreground", resolveResponsive(size, TEXT_SIZE))}>
      {label}
      {required ? <span className="ml-0.5 text-danger">*</span> : null}
    </label>
  );
}

interface DatePickerMessagesProps {
  hint?: string;
  hintId?: string;
  error?: string;
  errorId?: string;
}

export function DatePickerMessages({ hint, hintId, error, errorId }: DatePickerMessagesProps) {
  return (
    <>
      {hint && !error ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-xs font-medium text-danger animate-fade-in">
          {error}
        </p>
      ) : null}
    </>
  );
}
