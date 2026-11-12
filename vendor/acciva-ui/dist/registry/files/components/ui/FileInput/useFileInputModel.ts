import { useId, useImperativeHandle, type ForwardedRef } from "react";
import { describeAccept, formatBytes, type CropAspect } from "@/lib/image/index";
import { ICON_SIZE_CLASS, TEXT_SIZE, resolveResponsive } from "@/lib/sizing-tokens/index";
import { cn } from "@/lib/utils";
import { useFormField } from "@/components/ui/FormField/index";
import { DEFAULT_MESSAGES, SAFE_PREVIEW } from "@/components/ui/FileInput/constants";
import type { FileInputConfig, FileInputCropConfig, FileInputProps } from "@/components/ui/FileInput/types";
import { useFileInputCrop } from "@/components/ui/FileInput/useFileInputCrop";
import { useFileInputDrop } from "@/components/ui/FileInput/useFileInputDrop";
import { useFileInputPipeline } from "@/components/ui/FileInput/useFileInputPipeline";
import { useFileInputState } from "@/components/ui/FileInput/useFileInputState";

// Inside a <FormField> the field's context fills unset props; standalone the hook throws.
function useOptionalFormField() {
  try {
    return useFormField();
  } catch {
    return null;
  }
}

function surfaceClass(disabled: boolean, drag: "accept" | "reject" | null, invalid: boolean) {
  return cn(
    "transition-colors motion-feedback",
    disabled
      ? "cursor-not-allowed opacity-60 bg-elevation-2"
      : drag === "accept"
        ? "cursor-pointer border-primary-500 bg-primary-50 dark:bg-primary-950"
        : drag === "reject" || invalid
          ? "cursor-pointer border-danger bg-background"
          : "cursor-pointer bg-background hover:bg-elevation-1",
  );
}

export function useFileInputModel(props: FileInputProps, forwardedRef: ForwardedRef<HTMLInputElement>) {
  const {
    variant = "dropzone",
    value,
    defaultValue,
    onChange,
    onReject,
    accept,
    multiple: multipleProp = false,
    maxFiles: maxFilesProp,
    maxSize,
    minSize,
    compress = false,
    crop: cropProp,
    paste = false,
    fileState,
    previewSrc,
    label,
    hint,
    error: errorProp,
    required,
    disabled: disabledProp,
    name,
    id,
    size: sizeProp,
    messages: messagesProp,
    className,
    "aria-describedby": describedBy,
    ...rest
  } = props;

  const field = useOptionalFormField();
  const generatedId = useId();
  const inputId = id ?? field?.id ?? generatedId;
  const size = sizeProp ?? field?.size ?? "md";
  const error = errorProp ?? field?.error;
  const disabled = Boolean(disabledProp ?? field?.disabled);
  const m = { ...DEFAULT_MESSAGES, ...messagesProp };

  const isAvatar = variant === "avatar";
  const multiple = multipleProp && !isAvatar;
  const maxFiles = multiple ? (maxFilesProp ?? Infinity) : 1;
  const cropConfig: FileInputCropConfig | undefined =
    cropProp === undefined ? (isAvatar ? {} : undefined) : cropProp === true ? {} : cropProp || undefined;
  const cropAspect: CropAspect = isAvatar ? "circle" : (cropConfig?.aspect ?? "free");
  const compressOptions = compress || undefined;

  const config: FileInputConfig = {
    m,
    multiple,
    maxFiles,
    maxSize,
    minSize,
    accept,
    disabled,
    paste,
    cropConfig,
    cropAspect,
    compressOptions,
    onReject,
  };

  const state = useFileInputState(value, defaultValue, onChange, fileState, m);
  useImperativeHandle(forwardedRef, () => state.inputRef.current as HTMLInputElement);
  const pipeline = useFileInputPipeline(state, config);
  const crop = useFileInputCrop(state, config, pipeline);
  const drop = useFileInputDrop(state, config, pipeline.addFiles);

  const { files, previews, rejections, drag } = state;
  const invalid = Boolean(error) || rejections.length > 0;
  const acceptText = m.acceptHint(describeAccept(accept), maxSize !== undefined ? formatBytes(maxSize) : undefined);
  const acceptId = acceptText ? `${inputId}-accept` : undefined;
  const hintId = hint && !error ? `${inputId}-hint` : undefined;
  const errorId = error && errorProp !== undefined ? `${inputId}-error` : undefined;
  const rejectionsId = rejections.length ? `${inputId}-rejections` : undefined;
  const describedByIds =
    [describedBy, acceptId, hintId, errorId, rejectionsId].filter(Boolean).join(" ") || undefined;
  const surfaceState = surfaceClass(disabled, drag, invalid);
  const iconClass = resolveResponsive(size, ICON_SIZE_CLASS);
  const textClass = resolveResponsive(size, TEXT_SIZE);
  const avatarSrc = isAvatar ? (files[0] ? previews.get(files[0]) : previewSrc && SAFE_PREVIEW.test(previewSrc) ? previewSrc : undefined) : undefined;

  return {
    ...state,
    ...pipeline,
    ...crop,
    ...drop,
    variant,
    isAvatar,
    multiple,
    disabled,
    paste,
    m,
    size,
    label,
    hint,
    error,
    required,
    name,
    inputId,
    className,
    cropConfig,
    nativeProps: rest,
    invalid,
    acceptId,
    acceptText,
    hintId,
    errorId,
    rejectionsId,
    describedByIds,
    surfaceState,
    iconClass,
    textClass,
    avatarSrc,
  };
}
