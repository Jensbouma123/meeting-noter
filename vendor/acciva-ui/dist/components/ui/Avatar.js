"use client";
import { jsx as _jsx } from "react/jsx-runtime";
import { User } from "lucide-react";
import { useState } from "react";
import { cn } from "../../lib/utils.js";
const AVATAR_SIZE_CLASS = {
    sm: "size-8",
    md: "size-10",
    lg: "size-12",
};
const AVATAR_TEXT_CLASS = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
};
const AVATAR_ICON_CLASS = {
    sm: "size-4",
    md: "size-5",
    lg: "size-6",
};
function getAvatarInitials(name) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0)
        return "";
    if (parts.length === 1)
        return parts[0].slice(0, 2).toUpperCase();
    const first = parts[0][0] ?? "";
    const last = parts[parts.length - 1][0] ?? "";
    return `${first}${last}`.toUpperCase();
}
export function Avatar({ src, name, size = "md", fallback, className, ...props }) {
    const [errorSrc, setErrorSrc] = useState(undefined);
    const decorative = props["aria-hidden"] === true || props["aria-hidden"] === "true";
    const trimmedName = name?.trim() ?? "";
    const initials = trimmedName ? getAvatarInitials(trimmedName) : "";
    const showImage = Boolean(src) && errorSrc !== src;
    if (process.env.NODE_ENV !== "production" && src && !trimmedName) {
        console.error('[a11y] <Avatar src> was given no `name`, so the image ships with an empty alt and no accessible name. Pass the person\'s name so the image is announced (WCAG 2.2 AA SC 1.1.1 Non-text Content). If the avatar is purely decorative inside an already-labelled control, pass `aria-hidden` instead.');
    }
    const labelProps = !decorative && !showImage && initials ? { role: "img", "aria-label": trimmedName } : {};
    return (_jsx("span", { ...labelProps, ...props, className: cn("inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full bg-elevation-2 font-medium text-muted-foreground", AVATAR_SIZE_CLASS[size], AVATAR_TEXT_CLASS[size], className), children: showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- a dependency-free <img> keeps Avatar out of next/image; loading is lazy and the disc footprint never shifts
        _jsx("img", { src: src, alt: decorative ? "" : trimmedName, loading: "lazy", decoding: "async", draggable: false, onError: () => setErrorSrc(src), className: "size-full object-cover" })) : initials ? (_jsx("span", { "aria-hidden": "true", children: initials })) : ((fallback ?? _jsx(User, { "aria-hidden": "true", className: AVATAR_ICON_CLASS[size] }))) }));
}
