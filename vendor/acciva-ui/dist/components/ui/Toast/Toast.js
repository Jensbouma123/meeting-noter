"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useBottomNavHeight } from "../BottomNav/index.js";
import { VARIANT_POLITENESS } from "../variant-tokens.js";
import { cn } from "../../../lib/utils.js";
import { ALL_POSITIONS, DEFAULT_HOTKEY, DEFAULT_MAX_VISIBLE, DEFAULT_POSITION, POSITION_HORIZONTAL_CLASS, } from "./constants.js";
import { isTopPosition } from "./toastState.js";
import { ToastCard } from "./ToastParts.js";
import { useToastApi } from "./useToastApi.js";
import { ToastContext } from "./useToast.js";
import { useToastRegion } from "./useToastRegion.js";
import { useToastTimers } from "./useToastTimers.js";
export function ToastProvider({ children, position = DEFAULT_POSITION, maxVisible = DEFAULT_MAX_VISIBLE, hotkey = DEFAULT_HOTKEY, }) {
    const [toasts, setToasts] = useState([]);
    const bottomNavHeight = useBottomNavHeight();
    const { requestDismiss, pauseToastTimer, resumeToastTimer, clearAllTimers } = useToastTimers(toasts, setToasts, maxVisible);
    const contextValue = useToastApi({ position, maxVisible, setToasts, requestDismiss, clearAllTimers });
    const { rootRef, handleRegionKeyDown } = useToastRegion(hotkey);
    return (_jsxs(ToastContext.Provider, { value: contextValue, children: [children, _jsx("div", { ref: rootRef, popover: "manual", onKeyDown: handleRegionKeyDown, className: "pointer-events-none fixed inset-0 m-0 size-full overflow-visible border-0 bg-transparent p-0", children: ALL_POSITIONS.map((pos) => {
                    const atPosition = toasts.filter((t) => t.position === pos && t.status !== "queued");
                    const ordered = isTopPosition(pos) ? [...atPosition].reverse() : atPosition;
                    const assertiveToasts = ordered.filter((t) => VARIANT_POLITENESS[t.variant] === "assertive");
                    const politeToasts = ordered.filter((t) => VARIANT_POLITENESS[t.variant] === "polite");
                    const regionStyle = isTopPosition(pos)
                        ? { top: "calc(env(safe-area-inset-top) + 1rem)" }
                        : {
                            bottom: `calc(env(safe-area-inset-bottom) + ${bottomNavHeight > 0 ? `${bottomNavHeight}px + ` : ""}1rem)`,
                        };
                    return (_jsxs("div", { className: cn("fixed inset-x-4 z-50 flex flex-col gap-2 pointer-events-none sm:inset-x-auto sm:w-full sm:max-w-sm", POSITION_HORIZONTAL_CLASS[pos]), style: regionStyle, children: [_jsx("div", { role: "alert", "aria-live": "assertive", className: "flex flex-col gap-2", children: assertiveToasts.map((t) => (_jsx(ToastCard, { toast: t, onDismiss: requestDismiss, onPause: pauseToastTimer, onResume: resumeToastTimer }, t.id))) }), _jsx("div", { role: "status", "aria-live": "polite", className: "flex flex-col gap-2", children: politeToasts.map((t) => (_jsx(ToastCard, { toast: t, onDismiss: requestDismiss, onPause: pauseToastTimer, onResume: resumeToastTimer }, t.id))) })] }, pos));
                }) })] }));
}
