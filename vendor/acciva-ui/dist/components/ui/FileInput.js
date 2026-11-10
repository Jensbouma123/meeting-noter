"use client";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { forwardRef, useCallback, useEffect, useId, useImperativeHandle, useRef, useState, } from "react";
import { Camera, Check, Crop, File as FileIcon, Upload, User, X } from "lucide-react";
import { ImageProcessError, compressImage, cropImage, describeAccept, formatBytes, initialCropRect, isCroppable, matchesAccept, resolveAccept, } from "../../lib/image/index.js";
import { CONTROL_HEIGHT, CONTROL_RADIUS, ICON_SIZE_CLASS, INPUT_PADDING_X, TEXT_SIZE, resolveResponsive, } from "../../lib/sizing-tokens.js";
import { cn } from "../../lib/utils.js";
import { Badge } from "./Badge.js";
import { Button } from "./Button.js";
import { useFormField } from "./FormField.js";
import { ImageCropper } from "./ImageCropper.js";
import { Modal } from "./Modal.js";
const plural = (n) => (n === 1 ? "1 file" : `${n} files`);
const DEFAULT_MESSAGES = {
    dropPrompt: (multiple) => (multiple ? "Drag files here or" : "Drag a file here or"),
    browse: "browse",
    change: "Change",
    empty: "No file chosen",
    dropActive: "Drop to add",
    dropReject: "File type not accepted",
    acceptHint: (types, maxSize) => [types, maxSize && `up to ${maxSize}`].filter(Boolean).join(" · "),
    added: (files) => (files.length === 1 ? `${files[0].name} added` : `${plural(files.length)} added`),
    removed: (name) => `${name} removed`,
    processing: (count) => `Processing ${plural(count)}…`,
    rejected: (r) => r.message,
    type: "isn't an accepted file type",
    maxSize: (limit) => `is larger than ${limit}`,
    minSize: (limit) => `is smaller than ${limit}`,
    count: (max) => `wasn't added: limit is ${plural(max)}`,
    process: "couldn't be processed",
    cropTitle: "Crop image",
    cropApply: "Apply",
    cropCancel: "Cancel",
    cropCancelled: "Crop cancelled",
    remove: (name) => `Remove ${name}`,
    crop: (name) => `Crop ${name}`,
    uploaded: (name) => `${name} uploaded`,
    failed: (name, error) => (error ? `${name} failed: ${error}` : `${name} failed`),
};
const AVATAR_SIZE = {
    xxs: "size-12",
    xs: "size-14",
    sm: "size-20",
    md: "size-24",
    lg: "size-28",
    xl: "size-32",
    "2xl": "size-36",
    "3xl": "size-40",
};
const STEP_DOWN = {
    xxs: "xxs",
    xs: "xxs",
    sm: "xs",
    md: "sm",
    lg: "md",
    xl: "lg",
    "2xl": "xl",
    "3xl": "2xl",
};
// The compact Browse affordance sits inside the Input-height row, one tier below it.
function stepDown(size) {
    if (typeof size === "string")
        return STEP_DOWN[size];
    const { base, sm, md, lg } = size;
    return {
        base: STEP_DOWN[base],
        sm: sm && STEP_DOWN[sm],
        md: md && STEP_DOWN[md],
        lg: lg && STEP_DOWN[lg],
    };
}
const PEER_FOCUS = "peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary-500";
const SAFE_PREVIEW = /^(https|blob):/i;
// Inside a <FormField> the field's context fills unset props; standalone the hook throws.
function useOptionalFormField() {
    try {
        return useFormField();
    }
    catch (_a) {
        return null;
    }
}
export const FileInput = forwardRef(function FileInput(_a, forwardedRef) {
    var _b, _c, _d;
    var { variant = "dropzone", value, defaultValue, onChange, onReject, accept, multiple: multipleProp = false, maxFiles: maxFilesProp, maxSize, minSize, compress = false, crop: cropProp, paste = false, fileState, previewSrc, label, hint: hintProp, error: errorProp, required, disabled: disabledProp, name, id, size: sizeProp, messages: messagesProp, className, "aria-describedby": describedBy } = _a, rest = __rest(_a, ["variant", "value", "defaultValue", "onChange", "onReject", "accept", "multiple", "maxFiles", "maxSize", "minSize", "compress", "crop", "paste", "fileState", "previewSrc", "label", "hint", "error", "required", "disabled", "name", "id", "size", "messages", "className", "aria-describedby"]);
    const field = useOptionalFormField();
    const generatedId = useId();
    const inputId = (_b = id !== null && id !== void 0 ? id : field === null || field === void 0 ? void 0 : field.id) !== null && _b !== void 0 ? _b : generatedId;
    const size = (_c = sizeProp !== null && sizeProp !== void 0 ? sizeProp : field === null || field === void 0 ? void 0 : field.size) !== null && _c !== void 0 ? _c : "md";
    const error = errorProp !== null && errorProp !== void 0 ? errorProp : field === null || field === void 0 ? void 0 : field.error;
    const hint = hintProp;
    const disabled = Boolean(disabledProp !== null && disabledProp !== void 0 ? disabledProp : field === null || field === void 0 ? void 0 : field.disabled);
    const m = Object.assign(Object.assign({}, DEFAULT_MESSAGES), messagesProp);
    const isAvatar = variant === "avatar";
    const multiple = multipleProp && !isAvatar;
    const maxFiles = multiple ? (maxFilesProp !== null && maxFilesProp !== void 0 ? maxFilesProp : Infinity) : 1;
    const cropConfig = cropProp === undefined ? (isAvatar ? {} : undefined) : cropProp === true ? {} : cropProp || undefined;
    const cropAspect = isAvatar ? "circle" : ((_d = cropConfig === null || cropConfig === void 0 ? void 0 : cropConfig.aspect) !== null && _d !== void 0 ? _d : "free");
    const compressOptions = compress || undefined;
    const inputRef = useRef(null);
    const rootRef = useRef(null);
    useImperativeHandle(forwardedRef, () => inputRef.current);
    const [internal, setInternal] = useState(defaultValue !== null && defaultValue !== void 0 ? defaultValue : []);
    const files = value !== null && value !== void 0 ? value : internal;
    const [rejections, setRejections] = useState([]);
    const [announcement, setAnnouncement] = useState("");
    const [processing, setProcessing] = useState(false);
    const [drag, setDrag] = useState(null);
    const [cropSession, setCropSession] = useState(null);
    const [previews, setPreviews] = useState(new Map());
    const originals = useRef(new WeakMap());
    const abortRef = useRef(null);
    const focusAfterRemove = useRef(null);
    const lastStatus = useRef(new WeakMap());
    const commit = useCallback((next, details) => {
        if (value === undefined)
            setInternal(next);
        onChange === null || onChange === void 0 ? void 0 : onChange(next, details);
    }, [value, onChange]);
    // Object URLs follow the list: one per listed image, revoked on remove/replace/unmount.
    useEffect(() => {
        const next = new Map();
        for (const f of files)
            if (f.type.startsWith("image/"))
                next.set(f, URL.createObjectURL(f));
        // Object URLs are an external resource that needs cleanup, so they cannot be derived in render.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPreviews(next);
        return () => next.forEach((url) => URL.revokeObjectURL(url));
    }, [files]);
    useEffect(() => () => { var _a; return (_a = abortRef.current) === null || _a === void 0 ? void 0 : _a.abort(); }, []);
    // Processed files are written back so native forms (`FormData`, `required`) see them.
    const syncNative = useCallback((list) => {
        const input = inputRef.current;
        if (!input)
            return;
        if (typeof DataTransfer === "undefined") {
            if (list.length === 0)
                input.value = "";
            return;
        }
        const dt = new DataTransfer();
        for (const f of list)
            dt.items.add(f);
        input.files = dt.files;
    }, []);
    useEffect(() => syncNative(files), [files, syncNative]);
    useEffect(() => {
        var _a, _b, _c, _d;
        const index = focusAfterRemove.current;
        if (index === null)
            return;
        focusAfterRemove.current = null;
        const buttons = (_a = rootRef.current) === null || _a === void 0 ? void 0 : _a.querySelectorAll("[data-file-remove]");
        (_d = ((_c = (_b = buttons === null || buttons === void 0 ? void 0 : buttons[index]) !== null && _b !== void 0 ? _b : buttons === null || buttons === void 0 ? void 0 : buttons[index - 1]) !== null && _c !== void 0 ? _c : inputRef.current)) === null || _d === void 0 ? void 0 : _d.focus();
    }, [files]);
    // Announce upload transitions to done/error (uploading and progress ticks stay silent).
    const states = files.map((f) => fileState === null || fileState === void 0 ? void 0 : fileState(f));
    const statusKey = states.map((s) => { var _a; return (_a = s === null || s === void 0 ? void 0 : s.status) !== null && _a !== void 0 ? _a : ""; }).join("|");
    useEffect(() => {
        const said = [];
        files.forEach((f, i) => {
            const s = states[i];
            const prev = lastStatus.current.get(f);
            if ((s === null || s === void 0 ? void 0 : s.status) !== prev) {
                if ((s === null || s === void 0 ? void 0 : s.status) === "done")
                    said.push(m.uploaded(f.name));
                if ((s === null || s === void 0 ? void 0 : s.status) === "error")
                    said.push(m.failed(f.name, s.error));
            }
            lastStatus.current.set(f, s === null || s === void 0 ? void 0 : s.status);
        });
        if (said.length)
            setAnnouncement(said.join(". "));
        // `statusKey` captures every status change; the closure values are read fresh each run.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statusKey, files]);
    const reject = (file, reason) => {
        const text = reason === "type"
            ? m.type
            : reason === "max-size"
                ? m.maxSize(formatBytes(maxSize !== null && maxSize !== void 0 ? maxSize : 0))
                : reason === "min-size"
                    ? m.minSize(formatBytes(minSize !== null && minSize !== void 0 ? minSize : 0))
                    : reason === "count"
                        ? m.count(maxFiles)
                        : m.process;
        const r = { file, reason, message: `${file.name} ${text}` };
        return Object.assign(Object.assign({}, r), { message: m.rejected(r) });
    };
    const finish = (base, pairs, rejected, removed, cropped) => {
        const added = [];
        for (const [original, result] of pairs) {
            if (maxSize !== undefined && result.size > maxSize) {
                rejected.push(reject(original, "max-size"));
                continue;
            }
            if (result !== original)
                originals.current.set(result, original);
            added.push(result);
        }
        setProcessing(false);
        setRejections(rejected);
        if (rejected.length)
            onReject === null || onReject === void 0 ? void 0 : onReject(rejected);
        if (added.length)
            commit([...base, ...added], { added, removed, rejected, cropped });
        setAnnouncement([added.length ? m.added(added) : "", ...rejected.map((r) => r.message)].filter(Boolean).join(". "));
    };
    const runCompress = async (base, accepted, rejected, removed) => {
        var _a;
        (_a = abortRef.current) === null || _a === void 0 ? void 0 : _a.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        const pairs = [];
        if (compressOptions) {
            setProcessing(true);
            setAnnouncement(m.processing(accepted.length));
        }
        for (const f of accepted) {
            try {
                pairs.push([f, compressOptions ? await compressImage(f, compressOptions, { signal: controller.signal }) : f]);
            }
            catch (err) {
                if (controller.signal.aborted)
                    return;
                if (err instanceof ImageProcessError)
                    rejected.push(reject(f, "process"));
                else
                    throw err;
            }
        }
        if (controller.signal.aborted)
            return;
        finish(base, pairs, rejected, removed);
    };
    const addFiles = (incoming) => {
        if (disabled || incoming.length === 0 || cropSession)
            return;
        const batch = multiple ? incoming : incoming.slice(0, 1);
        const base = multiple ? files : [];
        const removed = multiple ? [] : [...files];
        const capacity = maxFiles - base.length;
        const rejected = [];
        const accepted = [];
        for (const f of batch) {
            if (!matchesAccept(f, accept))
                rejected.push(reject(f, "type"));
            else if (minSize !== undefined && f.size < minSize)
                rejected.push(reject(f, "min-size"));
            else if (accepted.length >= capacity)
                rejected.push(reject(f, "count"));
            else
                accepted.push(f);
        }
        if (cropConfig && cropConfig.auto !== false && accepted.length === 1 && isCroppable(accepted[0])) {
            setCropSession({ original: accepted[0], base: [...base], rejected, aspect: cropAspect });
            return;
        }
        if (accepted.length === 0) {
            finish(base, [], rejected, []);
            return;
        }
        void runCompress(base, accepted, rejected, removed);
    };
    const removeAt = (index) => {
        const file = files[index];
        const next = files.filter((_, i) => i !== index);
        originals.current.delete(file);
        focusAfterRemove.current = index;
        setRejections([]);
        commit(next, { added: [], removed: [file], rejected: [] });
        setAnnouncement(m.removed(file.name));
    };
    const cancelCrop = () => {
        setCropSession(null);
        setAnnouncement(m.cropCancelled);
    };
    const applyCrop = async () => {
        var _a, _b, _c;
        const session = cropSession;
        if (!(session === null || session === void 0 ? void 0 : session.rect))
            return;
        setCropSession(null);
        (_a = abortRef.current) === null || _a === void 0 ? void 0 : _a.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        setProcessing(true);
        setAnnouncement(m.processing(1));
        const rejected = (_b = session.rejected) !== null && _b !== void 0 ? _b : [];
        let result;
        try {
            result = await cropImage(session.original, session.rect, compressOptions, { signal: controller.signal });
        }
        catch (err) {
            if (controller.signal.aborted)
                return;
            if (!(err instanceof ImageProcessError))
                throw err;
            finish(files, [], [...rejected, reject(session.original, "process")], []);
            return;
        }
        if (controller.signal.aborted)
            return;
        const target = session.target;
        if (target) {
            // Re-crop: swap the entry in place, keep tracking the untouched original.
            if (maxSize !== undefined && result.size > maxSize) {
                finish(files, [], [reject(session.original, "max-size")], []);
                return;
            }
            originals.current.set(result, session.original);
            originals.current.delete(target);
            setProcessing(false);
            setRejections([]);
            commit(files.map((f) => (f === target ? result : f)), { added: [result], removed: [target], rejected: [], cropped: result });
            setAnnouncement(m.added([result]));
            return;
        }
        const base = (_c = session.base) !== null && _c !== void 0 ? _c : [];
        finish(base, [[session.original, result]], rejected, multiple ? [] : [...files], result);
    };
    const onInputChange = (event) => {
        var _a;
        const picked = Array.from((_a = event.target.files) !== null && _a !== void 0 ? _a : []);
        // Reset to the committed list: a rejected or cancelled pick never reaches a form, and
        // picking the same file again still fires `change`. A commit re-syncs via the effect.
        syncNative(files);
        addFiles(picked);
    };
    const resolvedAccept = resolveAccept(accept);
    const onDragOver = (event) => {
        var _a;
        event.preventDefault();
        if (disabled)
            return;
        // MIME types are visible during the drag; extension tokens are not, so only judge pure-MIME lists.
        const types = Array.from((_a = event.dataTransfer.items) !== null && _a !== void 0 ? _a : [], (item) => item.type);
        const judgeable = resolvedAccept && !resolvedAccept.includes(".") && types.length > 0 && types.every(Boolean);
        const ok = !judgeable || types.some((type) => matchesAccept({ name: "", type }, accept));
        setDrag(ok ? "accept" : "reject");
    };
    const onDragLeave = (event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
            setDrag(null);
    };
    const onDrop = (event) => {
        event.preventDefault();
        setDrag(null);
        addFiles(Array.from(event.dataTransfer.files));
    };
    const onPaste = (event) => {
        const pasted = Array.from(event.clipboardData.files);
        if (!pasted.length)
            return;
        event.preventDefault();
        addFiles(pasted);
    };
    // Focus first, as a <label> click would: the crop Modal then returns focus to the input (SC 2.4.3).
    const openPicker = () => {
        var _a, _b;
        if (disabled)
            return;
        (_a = inputRef.current) === null || _a === void 0 ? void 0 : _a.focus();
        (_b = inputRef.current) === null || _b === void 0 ? void 0 : _b.click();
    };
    const openRecrop = (file) => { var _a; return setCropSession({ original: (_a = originals.current.get(file)) !== null && _a !== void 0 ? _a : file, target: file, aspect: cropAspect }); };
    const invalid = Boolean(error) || rejections.length > 0;
    const typesText = describeAccept(accept);
    const acceptText = m.acceptHint(typesText, maxSize !== undefined ? formatBytes(maxSize) : undefined);
    const acceptId = acceptText ? `${inputId}-accept` : undefined;
    const hintId = hint && !error ? `${inputId}-hint` : undefined;
    const errorId = error && errorProp !== undefined ? `${inputId}-error` : undefined;
    const rejectionsId = rejections.length ? `${inputId}-rejections` : undefined;
    const describedByIds = [describedBy, acceptId, hintId, errorId, rejectionsId].filter(Boolean).join(" ") || undefined;
    const surfaceState = cn("transition-colors motion-feedback", disabled
        ? "cursor-not-allowed opacity-60 bg-elevation-2"
        : drag === "accept"
            ? "cursor-pointer border-primary-500 bg-primary-50 dark:bg-primary-950"
            : drag === "reject" || invalid
                ? "cursor-pointer border-danger bg-background"
                : "cursor-pointer bg-background hover:bg-elevation-1");
    const iconClass = resolveResponsive(size, ICON_SIZE_CLASS);
    const textClass = resolveResponsive(size, TEXT_SIZE);
    const nativeInput = (_jsx("input", Object.assign({ ref: inputRef, id: inputId, type: "file", name: name, accept: resolvedAccept, multiple: multiple, required: required, disabled: disabled, "aria-invalid": invalid ? true : undefined, "aria-describedby": describedByIds, onChange: onInputChange, className: "peer sr-only" }, rest)));
    const avatarSrc = isAvatar ? (files[0] ? previews.get(files[0]) : previewSrc && SAFE_PREVIEW.test(previewSrc) ? previewSrc : undefined) : undefined;
    return (_jsxs("div", { ref: rootRef, className: cn("flex w-full flex-col gap-1.5", isAvatar && "items-center", className), "aria-busy": processing || undefined, "data-state": processing ? "processing" : undefined, "data-drag": drag !== null && drag !== void 0 ? drag : undefined, onDragOver: onDragOver, onDragEnter: onDragOver, onDragLeave: onDragLeave, onDrop: onDrop, onPaste: paste && !disabled ? onPaste : undefined, children: [label ? (
            // The asterisk sits outside <label> so the accessible name stays the bare label; `required`
            // on the native input conveys the state (SC 1.3.1, 4.1.2).
            _jsxs("span", { className: cn("font-medium text-foreground", textClass), children: [_jsx("label", { htmlFor: inputId, children: label }), required ? (_jsx("span", { "aria-hidden": "true", className: "ml-0.5 text-danger", children: "*" })) : null] })) : null, _jsxs("div", { className: cn("relative", isAvatar ? "flex justify-center" : "w-full"), children: [nativeInput, variant === "dropzone" ? (_jsxs("div", { "aria-hidden": "true", onClick: openPicker, className: cn("flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border-control p-6 text-center sm:p-8", PEER_FOCUS, surfaceState, textClass), children: [_jsx(Upload, { className: "size-6 text-muted-foreground" }), _jsx("span", { className: "text-foreground", children: drag === "accept" ? m.dropActive : drag === "reject" ? m.dropReject : (_jsxs(_Fragment, { children: [m.dropPrompt(multiple), " ", _jsx("span", { className: "font-medium text-primary-800 underline underline-offset-4 dark:text-primary-300", children: m.browse })] })) })] })) : variant === "compact" ? (_jsxs("div", { "aria-hidden": "true", onClick: openPicker, className: cn("flex w-full items-center gap-2 border", invalid ? "border-danger" : "border-border", PEER_FOCUS, surfaceState, resolveResponsive(size, CONTROL_HEIGHT), resolveResponsive(size, CONTROL_RADIUS), resolveResponsive(size, INPUT_PADDING_X), textClass), children: [_jsx("span", { className: cn("min-w-0 flex-1 truncate", files.length ? "text-foreground" : "text-muted-foreground"), children: files.length === 0 ? m.empty : files.length === 1 ? files[0].name : plural(files.length) }), _jsx(Button, { asChild: true, variant: "outline", size: stepDown(size), className: "shrink-0", children: _jsx("span", { children: files.length ? m.change : m.browse }) })] })) : (_jsxs("div", { "aria-hidden": "true", onClick: openPicker, className: cn("relative flex items-center justify-center rounded-full border-2 border-dashed border-border-control", PEER_FOCUS, surfaceState, resolveResponsive(size, AVATAR_SIZE)), children: [avatarSrc ? (
                            // eslint-disable-next-line @next/next/no-img-element -- object/remote preview, not an optimisable asset
                            _jsx("img", { src: avatarSrc, alt: "", className: "size-full rounded-full object-cover" })) : (_jsx(User, { className: "size-1/2 text-muted-foreground" })), _jsx("span", { className: "absolute bottom-0 right-0 flex size-8 items-center justify-center rounded-full border border-border bg-background text-foreground", children: _jsx(Camera, { className: "size-4" }) })] }))] }), variant === "compact" && files.length > 1 && !disabled ? (_jsx(Button, { variant: "ghost", size: "sm", className: "self-start touch-target-44", onClick: () => {
                    focusAfterRemove.current = -1;
                    setRejections([]);
                    commit([], { added: [], removed: [...files], rejected: [] });
                    setAnnouncement(m.removed(plural(files.length)));
                }, children: m.remove(plural(files.length)) })) : null, isAvatar && files.length > 0 && !disabled ? (_jsx(Button, { variant: "ghost", size: "sm", className: "touch-target-44", onClick: () => removeAt(0), children: m.remove(files[0].name) })) : null, acceptId ? (_jsx("p", { id: acceptId, className: "text-xs text-muted-foreground", children: acceptText })) : null, error ? (errorId ? (_jsx("p", { id: errorId, role: "alert", className: "text-xs font-medium text-danger animate-fade-in", children: error })) : null) : hintId ? (_jsx("p", { id: hintId, className: "text-xs text-muted-foreground", children: hint })) : null, rejectionsId ? (_jsx("ul", { id: rejectionsId, className: "flex flex-col gap-0.5 text-xs font-medium text-danger", children: rejections.map((r, i) => (_jsx("li", { className: "break-words", children: r.message }, i))) })) : null, variant === "dropzone" && files.length > 0 ? (_jsx("ul", { className: "mt-1 flex flex-col gap-2", children: files.map((file, i) => {
                    var _a;
                    const state = states[i];
                    const preview = previews.get(file);
                    return (_jsxs("li", { className: "flex items-center gap-3 rounded-lg border border-border bg-background p-2", children: [preview ? (
                            // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
                            _jsx("img", { src: preview, alt: "", className: "size-10 shrink-0 rounded-md object-cover" })) : (_jsx("span", { className: "flex size-10 shrink-0 items-center justify-center rounded-md bg-elevation-2 text-muted-foreground", children: _jsx(FileIcon, { className: iconClass, "aria-hidden": "true" }) })), _jsxs("div", { className: "flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3", children: [_jsx("span", { title: file.name, className: cn("min-w-0 truncate text-foreground sm:flex-1", textClass), children: file.name }), _jsxs("span", { className: "flex flex-wrap items-center gap-2 text-xs text-muted-foreground", children: [_jsx("span", { children: formatBytes(file.size) }), (state === null || state === void 0 ? void 0 : state.status) === "uploading" ? (_jsx("span", { role: "progressbar", "aria-label": file.name, "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": state.progress, className: "block h-1.5 w-24 overflow-hidden rounded-full bg-elevation-2", children: _jsx("span", { className: cn("block h-full rounded-full bg-primary-500", state.progress === undefined && "w-1/3 animate-pulse"), style: state.progress !== undefined ? { width: `${Math.min(100, Math.max(0, state.progress))}%` } : undefined }) })) : (state === null || state === void 0 ? void 0 : state.status) === "done" ? (_jsxs("span", { className: "inline-flex items-center gap-1 text-success", children: [_jsx(Check, { className: "size-3.5", "aria-hidden": "true" }), m.uploaded(file.name)] })) : (state === null || state === void 0 ? void 0 : state.status) === "error" ? (_jsx(Badge, { variant: "danger", size: "xs", children: (_a = state.error) !== null && _a !== void 0 ? _a : m.failed(file.name) })) : null] })] }), cropConfig && isCroppable(file) && !disabled ? (_jsx(Button, { variant: "ghost", size: "sm", iconOnly: true, tooltip: m.crop(file.name), className: "touch-target-44", onClick: () => openRecrop(file), children: _jsx(Crop, { "aria-hidden": "true" }) })) : null, !disabled ? (_jsx(Button, { variant: "ghost", size: "sm", iconOnly: true, tooltip: m.remove(file.name), "data-file-remove": "", className: "touch-target-44", onClick: () => removeAt(i), children: _jsx(X, { "aria-hidden": "true" }) })) : null] }, `${file.name}-${file.lastModified}-${i}`));
                }) })) : null, _jsx("span", { role: "status", "aria-live": "polite", className: "sr-only", children: announcement }), cropSession ? (_jsx(Modal, { open: true, onClose: cancelCrop, title: m.cropTitle, size: "lg", footer: _jsxs(_Fragment, { children: [_jsx(Button, { variant: "outline", onClick: cancelCrop, children: m.cropCancel }), _jsx(Button, { onClick: () => void applyCrop(), disabled: !cropSession.rect, children: m.cropApply })] }), children: _jsx(ImageCropper, { source: cropSession.original, aspect: cropSession.aspect, aspectOptions: isAvatar ? undefined : cropConfig === null || cropConfig === void 0 ? void 0 : cropConfig.aspectOptions, label: cropConfig === null || cropConfig === void 0 ? void 0 : cropConfig.label, messages: cropConfig === null || cropConfig === void 0 ? void 0 : cropConfig.messages, onAspectChange: (aspect) => setCropSession((s) => s && Object.assign(Object.assign({}, s), { aspect, rect: s.dims ? initialCropRect(s.dims.width, s.dims.height, aspect) : s.rect })), onLoad: (dims) => setCropSession((s) => s && Object.assign(Object.assign({}, s), { dims, rect: initialCropRect(dims.width, dims.height, s.aspect) })), onChange: (rect) => setCropSession((s) => s && Object.assign(Object.assign({}, s), { rect })), onError: () => {
                        var _a;
                        setCropSession(null);
                        finish(files, [], [...((_a = cropSession.rejected) !== null && _a !== void 0 ? _a : []), reject(cropSession.original, "process")], []);
                    } }) })) : null] }));
});
