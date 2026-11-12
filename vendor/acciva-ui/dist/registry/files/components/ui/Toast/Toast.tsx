"use client";

import { useState, type CSSProperties } from "react";
import { useBottomNavHeight } from "@/components/ui/BottomNav/index";
import { VARIANT_POLITENESS } from "@/components/ui/variant-tokens";
import { cn } from "@/lib/utils";
import {
  ALL_POSITIONS,
  DEFAULT_HOTKEY,
  DEFAULT_MAX_VISIBLE,
  DEFAULT_POSITION,
  POSITION_HORIZONTAL_CLASS,
} from "@/components/ui/Toast/constants";
import { isTopPosition } from "@/components/ui/Toast/toastState";
import type { ToastProviderProps, ToastRecord } from "@/components/ui/Toast/types";
import { ToastCard } from "@/components/ui/Toast/ToastParts";
import { useToastApi } from "@/components/ui/Toast/useToastApi";
import { ToastContext } from "@/components/ui/Toast/useToast";
import { useToastRegion } from "@/components/ui/Toast/useToastRegion";
import { useToastTimers } from "@/components/ui/Toast/useToastTimers";

export function ToastProvider({
  children,
  position = DEFAULT_POSITION,
  maxVisible = DEFAULT_MAX_VISIBLE,
  hotkey = DEFAULT_HOTKEY,
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const bottomNavHeight = useBottomNavHeight();
  const { requestDismiss, pauseToastTimer, resumeToastTimer, clearAllTimers } = useToastTimers(
    toasts,
    setToasts,
    maxVisible,
  );
  const contextValue = useToastApi({ position, maxVisible, setToasts, requestDismiss, clearAllTimers });
  const { rootRef, handleRegionKeyDown } = useToastRegion(hotkey);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div
        ref={rootRef}
        popover="manual"
        onKeyDown={handleRegionKeyDown}
        className="pointer-events-none fixed inset-0 m-0 size-full overflow-visible border-0 bg-transparent p-0"
      >
        {ALL_POSITIONS.map((pos) => {
          const atPosition = toasts.filter((t) => t.position === pos && t.status !== "queued");
          const ordered = isTopPosition(pos) ? [...atPosition].reverse() : atPosition;
          const assertiveToasts = ordered.filter((t) => VARIANT_POLITENESS[t.variant] === "assertive");
          const politeToasts = ordered.filter((t) => VARIANT_POLITENESS[t.variant] === "polite");
          const regionStyle: CSSProperties = isTopPosition(pos)
            ? { top: "calc(env(safe-area-inset-top) + 1rem)" }
            : {
                bottom: `calc(env(safe-area-inset-bottom) + ${bottomNavHeight > 0 ? `${bottomNavHeight}px + ` : ""}1rem)`,
              };

          return (
            <div
              key={pos}
              className={cn(
                "fixed inset-x-4 z-50 flex flex-col gap-2 pointer-events-none sm:inset-x-auto sm:w-full sm:max-w-sm",
                POSITION_HORIZONTAL_CLASS[pos],
              )}
              style={regionStyle}
            >
              <div role="alert" aria-live="assertive" className="flex flex-col gap-2">
                {assertiveToasts.map((t) => (
                  <ToastCard
                    key={t.id}
                    toast={t}
                    onDismiss={requestDismiss}
                    onPause={pauseToastTimer}
                    onResume={resumeToastTimer}
                  />
                ))}
              </div>
              <div role="status" aria-live="polite" className="flex flex-col gap-2">
                {politeToasts.map((t) => (
                  <ToastCard
                    key={t.id}
                    toast={t}
                    onDismiss={requestDismiss}
                    onPause={pauseToastTimer}
                    onResume={resumeToastTimer}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
