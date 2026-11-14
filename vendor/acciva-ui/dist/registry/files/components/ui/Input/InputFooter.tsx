import { InputMessages } from "@/components/ui/Input/InputParts";

interface InputFooterProps {
  hint?: string;
  error?: string;
  hintId?: string;
  errorId?: string;
  showCharCount: boolean;
  charCountId?: string;
  count: number;
  maxLength?: number;
}

// Hint, error and character counter under the field; renders nothing when none of them applies.
export function InputFooter({ hint, error, showCharCount, charCountId, ...rest }: InputFooterProps) {
  if (!hint && !error && !showCharCount) return null;
  return <InputMessages hint={hint} error={error} charCountId={showCharCount ? charCountId : undefined} {...rest} />;
}
