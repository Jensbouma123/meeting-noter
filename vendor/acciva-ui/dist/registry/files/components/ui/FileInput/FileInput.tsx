"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { FileInputActions, FileInputLabel, FileInputStatus } from "@/components/ui/FileInput/FileInputParts";
import { FileInputCropModal } from "@/components/ui/FileInput/FileInputCropModal";
import { FileInputList } from "@/components/ui/FileInput/FileInputList";
import { FileInputTrigger } from "@/components/ui/FileInput/FileInputTrigger";
import type { FileInputProps } from "@/components/ui/FileInput/types";
import { useFileInputModel } from "@/components/ui/FileInput/useFileInputModel";

export const FileInput = forwardRef<HTMLInputElement, FileInputProps>(function FileInput(props, forwardedRef) {
  const model = useFileInputModel(props, forwardedRef);

  return (
    <div
      ref={model.rootRef}
      className={cn("flex w-full flex-col gap-1.5", model.isAvatar && "items-center", model.className)}
      aria-busy={model.processing || undefined}
      data-state={model.processing ? "processing" : undefined}
      data-drag={model.drag ?? undefined}
      onDragOver={model.onDragOver}
      onDragEnter={model.onDragOver}
      onDragLeave={model.onDragLeave}
      onDrop={model.onDrop}
      onPaste={model.paste && !model.disabled ? model.onPaste : undefined}
    >
      <FileInputLabel label={model.label} required={model.required} inputId={model.inputId} textClass={model.textClass} />

      <div className={cn("relative", model.isAvatar ? "flex justify-center" : "w-full")}>
        <input
          ref={model.inputRef}
          id={model.inputId}
          type="file"
          name={model.name}
          accept={model.resolvedAccept}
          multiple={model.multiple}
          required={model.required}
          disabled={model.disabled}
          aria-invalid={model.invalid ? true : undefined}
          aria-describedby={model.describedByIds}
          onChange={model.onInputChange}
          className="peer sr-only"
          {...model.nativeProps}
        />
        <FileInputTrigger
          variant={model.variant}
          size={model.size}
          multiple={model.multiple}
          drag={model.drag}
          invalid={model.invalid}
          surfaceState={model.surfaceState}
          textClass={model.textClass}
          files={model.files}
          avatarSrc={model.avatarSrc}
          m={model.m}
          openPicker={model.openPicker}
        />
      </div>

      <FileInputActions
        variant={model.variant}
        isAvatar={model.isAvatar}
        files={model.files}
        disabled={model.disabled}
        m={model.m}
        clearAll={model.clearAll}
        removeAt={model.removeAt}
      />

      <FileInputStatus
        acceptId={model.acceptId}
        acceptText={model.acceptText}
        error={model.error}
        errorId={model.errorId}
        hint={model.hint}
        hintId={model.hintId}
        rejectionsId={model.rejectionsId}
        rejections={model.rejections}
      />

      {model.variant === "dropzone" && model.files.length > 0 ? (
        <FileInputList
          files={model.files}
          states={model.states}
          previews={model.previews}
          iconClass={model.iconClass}
          textClass={model.textClass}
          m={model.m}
          cropConfig={model.cropConfig}
          disabled={model.disabled}
          removeAt={model.removeAt}
          openRecrop={model.openRecrop}
        />
      ) : null}

      <span role="status" aria-live="polite" className="sr-only">
        {model.announcement}
      </span>

      {model.cropSession ? (
        <FileInputCropModal
          session={model.cropSession}
          m={model.m}
          aspectOptions={model.isAvatar ? undefined : model.cropConfig?.aspectOptions}
          label={model.cropConfig?.label}
          messages={model.cropConfig?.messages}
          onCancel={model.cancelCrop}
          onApply={model.applyCrop}
          onAspectChange={model.onAspectChange}
          onLoad={model.onLoad}
          onRectChange={model.onRectChange}
          onError={model.cropError}
        />
      ) : null}
    </div>
  );
});
