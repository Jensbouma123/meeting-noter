"use client";

import { X } from "lucide-react";
import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/Button/index";
import { SURFACE_RADIUS, SURFACE_SHADOW } from "@/lib/surface-tokens";
import { cn } from "@/lib/utils";
import type { ModalProps } from "@/components/ui/Modal/types";
import { useModalLifecycle } from "@/components/ui/Modal/useModalLifecycle";

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
};

// Evaluated per render, never at module scope: the server has no HTMLDialogElement.
const supportsClosedBy = () => typeof HTMLDialogElement !== "undefined" && "closedBy" in HTMLDialogElement.prototype;

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  confirmDismissal,
  role = "dialog",
  className,
  "aria-label": ariaLabel,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const mounted = useModalLifecycle(open, dialogRef);

  const requestClose = () => {
    if (confirmDismissal?.isDirty) setConfirmingDiscard(true);
    else onClose();
  };

  if (!mounted) return null;

  const discardPrompt = confirmDismissal ? (
    <Modal
      open={confirmingDiscard}
      onClose={() => setConfirmingDiscard(false)}
      role="alertdialog"
      size="sm"
      title={confirmDismissal.title}
      description={confirmDismissal.message}
      footer={
        <>
          <Button variant="outline" size="sm" onClick={() => setConfirmingDiscard(false)}>
            {confirmDismissal.keepLabel ?? "Keep editing"}
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              setConfirmingDiscard(false);
              onClose();
            }}
          >
            {confirmDismissal.discardLabel ?? "Discard"}
          </Button>
        </>
      }
    />
  ) : null;

  return (
    <dialog
      ref={dialogRef}
      // Implicit role="dialog" and modality come from showModal(); only the
      // alertdialog variant needs the explicit role (and aria-modal for the a11y audit).
      role={role === "alertdialog" ? role : undefined}
      aria-modal={role === "alertdialog" ? "true" : undefined}
      tabIndex={-1}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabel ? undefined : titleId}
      aria-describedby={description ? descriptionId : undefined}
      closedby="any"
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
      // Light dismiss for browsers without `closedby` (Safari): a click that lands on the
      // dialog element itself but outside its box is a backdrop click.
      onClick={
        supportsClosedBy()
          ? undefined
          : (event) => {
              if (event.target !== event.currentTarget) return;
              const { top, left, right, bottom } = event.currentTarget.getBoundingClientRect();
              if (event.clientY < top || event.clientY > bottom || event.clientX < left || event.clientX > right) {
                requestClose();
              }
            }
      }
      data-open={open}
      className={cn(
        "dialog-panel flex flex-col gap-4 focus-visible:outline-none border border-border bg-surface p-6 text-foreground motion-spatial ease-emphasized motion-reduce:transition-none",
        SURFACE_RADIUS.overlay,
        SURFACE_SHADOW.overlay,
        sizeClasses[size],
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id={titleId} className="text-lg font-semibold text-foreground">
            {title}
          </h2>
          {description ? (
            <p id={descriptionId} className="mt-1 text-sm text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={requestClose}
          aria-label="Close dialog"
          data-dialog-close
          className="focus-ring shrink-0 rounded-md p-1 text-muted-foreground transition-colors motion-feedback hover:bg-elevation-3 hover:text-foreground active:bg-elevation-4 active:text-foreground active:scale-99"
        >
          <X className="size-5" />
        </button>
      </div>
      {children ? <div className="text-sm text-foreground">{children}</div> : null}
      {footer ? <div className="flex items-center justify-end gap-2 pt-2">{footer}</div> : null}
      {discardPrompt}
    </dialog>
  );
}
