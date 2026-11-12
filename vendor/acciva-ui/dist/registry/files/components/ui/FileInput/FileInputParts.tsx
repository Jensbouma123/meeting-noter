import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button/index";
import { plural } from "@/components/ui/FileInput/constants";
import type { FileInputMessages, FileRejection } from "@/components/ui/FileInput/types";

export function FileInputLabel({
  label,
  required,
  inputId,
  textClass,
}: {
  label?: string;
  required?: boolean;
  inputId: string;
  textClass: string;
}) {
  return label ? (
    // The asterisk sits outside <label> so the accessible name stays the bare label; `required`
    // on the native input conveys the state (SC 1.3.1, 4.1.2).
    <span className={cn("font-medium text-foreground", textClass)}>
      <label htmlFor={inputId}>{label}</label>
      {required ? (
        <span aria-hidden="true" className="ml-0.5 text-danger">
          *
        </span>
      ) : null}
    </span>
  ) : null;
}

export function FileInputActions({
  variant,
  isAvatar,
  files,
  disabled,
  m,
  clearAll,
  removeAt,
}: {
  variant: "dropzone" | "compact" | "avatar";
  isAvatar: boolean;
  files: readonly File[];
  disabled: boolean;
  m: FileInputMessages;
  clearAll: () => void;
  removeAt: (index: number) => void;
}) {
  return (
    <>
      {variant === "compact" && files.length > 1 && !disabled ? (
        <Button variant="ghost" size="sm" className="self-start touch-target-44" onClick={clearAll}>
          {m.remove(plural(files.length))}
        </Button>
      ) : null}

      {isAvatar && files.length > 0 && !disabled ? (
        <Button variant="ghost" size="sm" className="touch-target-44" onClick={() => removeAt(0)}>
          {m.remove(files[0].name)}
        </Button>
      ) : null}
    </>
  );
}

export function FileInputStatus({
  acceptId,
  acceptText,
  error,
  errorId,
  hint,
  hintId,
  rejectionsId,
  rejections,
}: {
  acceptId?: string;
  acceptText: string;
  error?: string;
  errorId?: string;
  hint?: string;
  hintId?: string;
  rejectionsId?: string;
  rejections: FileRejection[];
}) {
  return (
    <>
      {acceptId ? (
        <p id={acceptId} className="text-xs text-muted-foreground">
          {acceptText}
        </p>
      ) : null}
      {error ? (
        errorId ? (
          <p id={errorId} role="alert" className="text-xs font-medium text-danger animate-fade-in">
            {error}
          </p>
        ) : null
      ) : hintId ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {rejectionsId ? (
        <ul id={rejectionsId} className="flex flex-col gap-0.5 text-xs font-medium text-danger">
          {rejections.map((r, i) => (
            <li key={i} className="break-words">
              {r.message}
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}
