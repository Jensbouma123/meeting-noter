import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { Camera, Upload, User } from "lucide-react";
import { CONTROL_HEIGHT, CONTROL_RADIUS, INPUT_PADDING_X, resolveResponsive } from "../../../lib/sizing-tokens/index.js";
import { cn } from "../../../lib/utils.js";
import { Button } from "../Button/index.js";
import { AVATAR_SIZE, PEER_FOCUS, plural, stepDown } from "./constants.js";
/** The visible click target for each variant; the native input stays sr-only beside it. */
export function FileInputTrigger({ variant, size, multiple, drag, invalid, surfaceState, textClass, files, avatarSrc, m, openPicker, }) {
    if (variant === "dropzone") {
        return (_jsxs("div", { "aria-hidden": "true", onClick: openPicker, className: cn("flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border-control p-6 text-center sm:p-8", PEER_FOCUS, surfaceState, textClass), children: [_jsx(Upload, { className: "size-6 text-muted-foreground" }), _jsx("span", { className: "text-foreground", children: drag === "accept" ? m.dropActive : drag === "reject" ? m.dropReject : (_jsxs(_Fragment, { children: [m.dropPrompt(multiple), " ", _jsx("span", { className: "font-medium text-primary-800 underline underline-offset-4 dark:text-primary-300", children: m.browse })] })) })] }));
    }
    if (variant === "compact") {
        return (_jsxs("div", { "aria-hidden": "true", onClick: openPicker, className: cn("flex w-full items-center gap-2 border", invalid ? "border-danger" : "border-border", PEER_FOCUS, surfaceState, resolveResponsive(size, CONTROL_HEIGHT), resolveResponsive(size, CONTROL_RADIUS), resolveResponsive(size, INPUT_PADDING_X), textClass), children: [_jsx("span", { className: cn("min-w-0 flex-1 truncate", files.length ? "text-foreground" : "text-muted-foreground"), children: files.length === 0 ? m.empty : files.length === 1 ? files[0].name : plural(files.length) }), _jsx(Button, { asChild: true, variant: "outline", size: stepDown(size), className: "shrink-0", children: _jsx("span", { children: files.length ? m.change : m.browse }) })] }));
    }
    return (_jsxs("div", { "aria-hidden": "true", onClick: openPicker, className: cn("relative flex items-center justify-center rounded-full border-2 border-dashed border-border-control", PEER_FOCUS, surfaceState, resolveResponsive(size, AVATAR_SIZE)), children: [avatarSrc ? (
            // eslint-disable-next-line @next/next/no-img-element -- object/remote preview, not an optimisable asset
            _jsx("img", { src: avatarSrc, alt: "", className: "size-full rounded-full object-cover" })) : (_jsx(User, { className: "size-1/2 text-muted-foreground" })), _jsx("span", { className: "absolute bottom-0 right-0 flex size-8 items-center justify-center rounded-full border border-border bg-background text-foreground", children: _jsx(Camera, { className: "size-4" }) })] }));
}
