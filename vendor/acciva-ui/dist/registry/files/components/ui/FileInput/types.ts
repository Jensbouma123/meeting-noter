import type { InputHTMLAttributes } from "react";
import type { CompressOptions, CompressPreset, CropAspect, CropRect, FileAcceptPreset } from "@/lib/image/index";
import type { ResponsiveSize, SizeTier } from "@/lib/sizing-tokens/index";
import type { ImageCropperMessages } from "@/components/ui/ImageCropper/index";

export type { CompressOptions, CompressPreset, CropAspect, CropRect, FileAcceptPreset };
export type FileRejectionReason = "type" | "max-size" | "min-size" | "count" | "process";
export interface FileRejection {
  file: File;
  reason: FileRejectionReason;
  message: string;
}
export interface FileChangeDetails {
  added: File[];
  removed: File[];
  rejected: FileRejection[];
  cropped?: File;
}
export type FileItemStatus = "idle" | "uploading" | "done" | "error";
export interface FileItemState {
  status?: FileItemStatus;
  progress?: number;
  error?: string;
}
export interface FileInputCropConfig {
  aspect?: CropAspect;
  aspectOptions?: readonly CropAspect[];
  auto?: boolean;
  /** Forwarded to the ImageCropper (zoom, aspect, instructions, …) for translated UIs. */
  messages?: Partial<ImageCropperMessages>;
  /** Forwarded to the ImageCropper's crop-area label. */
  label?: string;
}

export interface FileInputMessages {
  dropPrompt: (multiple: boolean) => string;
  browse: string;
  change: string;
  empty: string;
  dropActive: string;
  dropReject: string;
  acceptHint: (types: string, maxSize?: string) => string;
  added: (files: readonly File[]) => string;
  removed: (name: string) => string;
  processing: (count: number) => string;
  rejected: (r: FileRejection) => string;
  type: string;
  maxSize: (limit: string) => string;
  minSize: (limit: string) => string;
  count: (max: number) => string;
  process: string;
  cropTitle: string;
  cropApply: string;
  cropCancel: string;
  cropCancelled: string;
  remove: (name: string) => string;
  crop: (name: string) => string;
  uploaded: (name: string) => string;
  failed: (name: string, error?: string) => string;
}

export interface FileInputProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "type" | "value" | "defaultValue" | "onChange" | "accept" | "multiple" | "size" | "children"
  > {
  variant?: "dropzone" | "compact" | "avatar";
  value?: readonly File[];
  defaultValue?: readonly File[];
  onChange?: (files: File[], details: FileChangeDetails) => void;
  onReject?: (rejections: FileRejection[]) => void;
  accept?: FileAcceptPreset | string;
  multiple?: boolean;
  maxFiles?: number;
  maxSize?: number;
  minSize?: number;
  compress?: false | CompressPreset | CompressOptions;
  crop?: boolean | FileInputCropConfig;
  paste?: boolean;
  fileState?: (file: File) => FileItemState | undefined;
  previewSrc?: string;
  label?: string;
  hint?: string;
  error?: string;
  size?: ResponsiveSize<SizeTier>;
  messages?: Partial<FileInputMessages>;
}

export interface CropSession {
  /** Unprocessed source the crop is drawn from. */
  original: File;
  /** List entry being re-cropped; absent for an auto-crop on add. */
  target?: File;
  /** Auto-crop only: the list the new file joins and the batch's earlier rejections. */
  base?: File[];
  rejected?: FileRejection[];
  aspect: CropAspect;
  dims?: { width: number; height: number };
  rect?: CropRect;
}

/** The resolved props the hooks share; built once per render in `useFileInputModel`. */
export interface FileInputConfig {
  m: FileInputMessages;
  multiple: boolean;
  maxFiles: number;
  maxSize?: number;
  minSize?: number;
  accept?: FileAcceptPreset | string;
  disabled: boolean;
  paste: boolean;
  cropConfig?: FileInputCropConfig;
  cropAspect: CropAspect;
  compressOptions?: CompressPreset | CompressOptions;
  onReject?: (rejections: FileRejection[]) => void;
}
