import { useId, useImperativeHandle } from "react";
import { describeAccept, formatBytes } from "../../../lib/image/index.js";
import { ICON_SIZE_CLASS, TEXT_SIZE, resolveResponsive } from "../../../lib/sizing-tokens/index.js";
import { cn } from "../../../lib/utils.js";
import { useFormField } from "../FormField/index.js";
import { DEFAULT_MESSAGES, SAFE_PREVIEW } from "./constants.js";
import { useFileInputCrop } from "./useFileInputCrop.js";
import { useFileInputDrop } from "./useFileInputDrop.js";
import { useFileInputPipeline } from "./useFileInputPipeline.js";
import { useFileInputState } from "./useFileInputState.js";
// Inside a <FormField> the field's context fills unset props; standalone the hook throws.
function useOptionalFormField() {
    try {
        return useFormField();
    }
    catch {
        return null;
    }
}
function surfaceClass(disabled, drag, invalid) {
    return cn("transition-colors motion-feedback", disabled
        ? "cursor-not-allowed opacity-60 bg-elevation-2"
        : drag === "accept"
            ? "cursor-pointer border-primary-500 bg-primary-50 dark:bg-primary-950"
            : drag === "reject" || invalid
                ? "cursor-pointer border-danger bg-background"
                : "cursor-pointer bg-background hover:bg-elevation-1");
}
export function useFileInputModel(props, forwardedRef) {
    const { variant = "dropzone", value, defaultValue, onChange, onReject, accept, multiple: multipleProp = false, maxFiles: maxFilesProp, maxSize, minSize, compress = false, crop: cropProp, paste = false, fileState, previewSrc, label, hint, error: errorProp, required, disabled: disabledProp, name, id, size: sizeProp, messages: messagesProp, className, "aria-describedby": describedBy, ...rest } = props;
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
    const cropConfig = cropProp === undefined ? (isAvatar ? {} : undefined) : cropProp === true ? {} : cropProp || undefined;
    const cropAspect = isAvatar ? "circle" : (cropConfig?.aspect ?? "free");
    const compressOptions = compress || undefined;
    const config = {
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
    useImperativeHandle(forwardedRef, () => state.inputRef.current);
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
    const describedByIds = [describedBy, acceptId, hintId, errorId, rejectionsId].filter(Boolean).join(" ") || undefined;
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
