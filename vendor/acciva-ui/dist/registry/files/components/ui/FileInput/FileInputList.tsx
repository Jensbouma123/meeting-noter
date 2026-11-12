import { Check, Crop, File as FileIcon, X } from "lucide-react";
import { formatBytes, isCroppable } from "@/lib/image/index";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge/index";
import { Button } from "@/components/ui/Button/index";
import type { FileInputCropConfig, FileInputMessages, FileItemState } from "@/components/ui/FileInput/types";

interface FileInputListProps {
  files: readonly File[];
  states: (FileItemState | undefined)[];
  previews: ReadonlyMap<File, string>;
  iconClass: string;
  textClass: string;
  m: FileInputMessages;
  cropConfig?: FileInputCropConfig;
  disabled: boolean;
  removeAt: (index: number) => void;
  openRecrop: (file: File) => void;
}

export function FileInputList({
  files,
  states,
  previews,
  iconClass,
  textClass,
  m,
  cropConfig,
  disabled,
  removeAt,
  openRecrop,
}: FileInputListProps) {
  return (
    <ul className="mt-1 flex flex-col gap-2">
      {files.map((file, i) => {
        const state = states[i];
        const preview = previews.get(file);
        return (
          <li
            key={`${file.name}-${file.lastModified}-${i}`}
            className="flex items-center gap-3 rounded-lg border border-border bg-background p-2"
          >
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
              <img src={preview} alt="" className="size-10 shrink-0 rounded-md object-cover" />
            ) : (
              <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-elevation-2 text-muted-foreground">
                <FileIcon className={iconClass} aria-hidden="true" />
              </span>
            )}
            <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
              <span title={file.name} className={cn("min-w-0 truncate text-foreground sm:flex-1", textClass)}>
                {file.name}
              </span>
              <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>{formatBytes(file.size)}</span>
                {state?.status === "uploading" ? (
                  <span
                    role="progressbar"
                    aria-label={file.name}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={state.progress}
                    className="block h-1.5 w-24 overflow-hidden rounded-full bg-elevation-2"
                  >
                    <span
                      className={cn(
                        "block h-full rounded-full bg-primary-500",
                        state.progress === undefined && "w-1/3 animate-pulse",
                      )}
                      style={state.progress !== undefined ? { width: `${Math.min(100, Math.max(0, state.progress))}%` } : undefined}
                    />
                  </span>
                ) : state?.status === "done" ? (
                  <span className="inline-flex items-center gap-1 text-success">
                    <Check className="size-3.5" aria-hidden="true" />
                    {m.uploaded(file.name)}
                  </span>
                ) : state?.status === "error" ? (
                  <Badge variant="danger" size="xs">
                    {state.error ?? m.failed(file.name)}
                  </Badge>
                ) : null}
              </span>
            </div>
            {cropConfig && isCroppable(file) && !disabled ? (
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                tooltip={m.crop(file.name)}
                className="touch-target-44"
                onClick={() => openRecrop(file)}
              >
                <Crop aria-hidden="true" />
              </Button>
            ) : null}
            {!disabled ? (
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                tooltip={m.remove(file.name)}
                data-file-remove=""
                className="touch-target-44"
                onClick={() => removeAt(i)}
              >
                <X aria-hidden="true" />
              </Button>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
