import { useCallback, useMemo, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { defaultToastDuration } from "@/components/ui/Toast/constants";
import { generateToastId } from "@/components/ui/Toast/toastState";
import type { ToastContextValue, ToastFn, ToastOptions, ToastPosition, ToastRecord, ToastVariant } from "@/components/ui/Toast/types";

interface ToastApiOptions {
  position: ToastPosition;
  maxVisible: number;
  setToasts: Dispatch<SetStateAction<ToastRecord[]>>;
  requestDismiss: (id: string) => void;
  clearAllTimers: () => void;
}

export function useToastApi({
  position,
  maxVisible,
  setToasts,
  requestDismiss,
  clearAllTimers,
}: ToastApiOptions): ToastContextValue {
  const addToast = useCallback(
    (variant: ToastVariant, options: ToastOptions): string => {
      const id = generateToastId();
      const toastPosition = options.position ?? position;
      const dismissible = options.dismissible ?? true;
      const duration = options.duration ?? defaultToastDuration(variant, !!options.action);
      const createdAt = Date.now();

      if (process.env.NODE_ENV !== "production" && !dismissible && !Number.isFinite(duration) && !options.action) {
        console.warn(
          "[Toast] a non-dismissible toast with duration: Infinity and no action can never be closed by the user.",
        );
      }

      setToasts((prev) => {
        const visibleCount = prev.filter((t) => t.position === toastPosition && t.status === "visible").length;
        const status: ToastRecord["status"] = visibleCount < maxVisible ? "visible" : "queued";
        const record: ToastRecord = {
          id,
          variant,
          title: options.title,
          description: options.description,
          action: options.action,
          dismissible,
          position: toastPosition,
          duration,
          createdAt,
          status,
        };
        return [...prev, record];
      });

      return id;
    },
    [position, maxVisible, setToasts],
  );

  const dismissAll = useCallback(() => {
    clearAllTimers();
    setToasts([]);
  }, [clearAllTimers, setToasts]);

  const toastFn = useMemo(() => {
    const call = (options: ToastOptions & { variant?: ToastVariant }) => addToast(options.variant ?? "info", options);
    return Object.assign(call, {
      success: (message: ReactNode, opts?: ToastOptions) => addToast("success", { ...opts, title: message }),
      danger: (message: ReactNode, opts?: ToastOptions) => addToast("danger", { ...opts, title: message }),
      warning: (message: ReactNode, opts?: ToastOptions) => addToast("warning", { ...opts, title: message }),
      info: (message: ReactNode, opts?: ToastOptions) => addToast("info", { ...opts, title: message }),
    }) as ToastFn;
  }, [addToast]);

  return useMemo<ToastContextValue>(
    () => ({ toast: toastFn, dismiss: requestDismiss, dismissAll }),
    [toastFn, requestDismiss, dismissAll],
  );
}
