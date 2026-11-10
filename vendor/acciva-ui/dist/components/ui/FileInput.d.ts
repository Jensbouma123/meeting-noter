import { type InputHTMLAttributes } from "react";
import { type CompressOptions, type CompressPreset, type CropAspect, type CropRect, type FileAcceptPreset } from "../../lib/image/index.js";
import { type ResponsiveSize, type SizeTier } from "../../lib/sizing-tokens.js";
import { type ImageCropperMessages } from "./ImageCropper.js";
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
export interface FileInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "defaultValue" | "onChange" | "accept" | "multiple" | "size" | "children"> {
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
export declare const FileInput: import("react").ForwardRefExoticComponent<FileInputProps & import("react").RefAttributes<HTMLInputElement>>;
