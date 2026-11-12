import { Camera, Upload, User } from "lucide-react";
import { CONTROL_HEIGHT, CONTROL_RADIUS, INPUT_PADDING_X, resolveResponsive, type ResponsiveSize, type SizeTier } from "@/lib/sizing-tokens/index";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button/index";
import { AVATAR_SIZE, PEER_FOCUS, plural, stepDown } from "@/components/ui/FileInput/constants";
import type { FileInputMessages } from "@/components/ui/FileInput/types";

interface FileInputTriggerProps {
  variant: "dropzone" | "compact" | "avatar";
  size: ResponsiveSize<SizeTier>;
  multiple: boolean;
  drag: "accept" | "reject" | null;
  invalid: boolean;
  surfaceState: string;
  textClass: string;
  files: readonly File[];
  avatarSrc: string | undefined;
  m: FileInputMessages;
  openPicker: () => void;
}

/** The visible click target for each variant; the native input stays sr-only beside it. */
export function FileInputTrigger({
  variant,
  size,
  multiple,
  drag,
  invalid,
  surfaceState,
  textClass,
  files,
  avatarSrc,
  m,
  openPicker,
}: FileInputTriggerProps) {
  if (variant === "dropzone") {
    return (
      <div
        aria-hidden="true"
        onClick={openPicker}
        className={cn(
          "flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border-control p-6 text-center sm:p-8",
          PEER_FOCUS,
          surfaceState,
          textClass,
        )}
      >
        <Upload className="size-6 text-muted-foreground" />
        <span className="text-foreground">
          {drag === "accept" ? m.dropActive : drag === "reject" ? m.dropReject : (
            <>
              {m.dropPrompt(multiple)}{" "}
              <span className="font-medium text-primary-800 underline underline-offset-4 dark:text-primary-300">
                {m.browse}
              </span>
            </>
          )}
        </span>
      </div>
    );
  }
  if (variant === "compact") {
    return (
      <div
        aria-hidden="true"
        onClick={openPicker}
        className={cn(
          "flex w-full items-center gap-2 border",
          invalid ? "border-danger" : "border-border",
          PEER_FOCUS,
          surfaceState,
          resolveResponsive(size, CONTROL_HEIGHT),
          resolveResponsive(size, CONTROL_RADIUS),
          resolveResponsive(size, INPUT_PADDING_X),
          textClass,
        )}
      >
        <span className={cn("min-w-0 flex-1 truncate", files.length ? "text-foreground" : "text-muted-foreground")}>
          {files.length === 0 ? m.empty : files.length === 1 ? files[0].name : plural(files.length)}
        </span>
        <Button asChild variant="outline" size={stepDown(size)} className="shrink-0">
          <span>{files.length ? m.change : m.browse}</span>
        </Button>
      </div>
    );
  }
  return (
    <div
      aria-hidden="true"
      onClick={openPicker}
      className={cn(
        "relative flex items-center justify-center rounded-full border-2 border-dashed border-border-control",
        PEER_FOCUS,
        surfaceState,
        resolveResponsive(size, AVATAR_SIZE),
      )}
    >
      {avatarSrc ? (
        // eslint-disable-next-line @next/next/no-img-element -- object/remote preview, not an optimisable asset
        <img src={avatarSrc} alt="" className="size-full rounded-full object-cover" />
      ) : (
        <User className="size-1/2 text-muted-foreground" />
      )}
      <span className="absolute bottom-0 right-0 flex size-8 items-center justify-center rounded-full border border-border bg-background text-foreground">
        <Camera className="size-4" />
      </span>
    </div>
  );
}
