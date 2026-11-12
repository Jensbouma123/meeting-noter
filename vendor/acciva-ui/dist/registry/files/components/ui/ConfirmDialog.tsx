"use client";

import { AlertTriangle, Info } from "lucide-react";
import { type ReactNode } from "react";
import { Button, type ButtonVariant } from "@/components/ui/Button/index";
import { Modal } from "@/components/ui/Modal/index";
import { cn } from "@/lib/utils";

export type ConfirmDialogVariant = "danger" | "primary" | "warning";

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmDialogVariant;
  loading?: boolean;
  children?: ReactNode;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "primary",
  loading = false,
  children,
}: ConfirmDialogProps) {
  const isDestructive = variant === "danger";

  const confirmButtonVariant: ButtonVariant = isDestructive
    ? "danger"
    : variant === "warning"
      ? "secondary"
      : "primary";

  const Icon = isDestructive ? AlertTriangle : Info;

  const titleWithIcon = (
    <div className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-lg",
          isDestructive ? "bg-danger/10 text-danger" : "bg-primary-500/10 text-primary-600 dark:text-primary-400",
        )}
      >
        <Icon className="size-4" />
      </span>
      <span>{title}</span>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      role="alertdialog"
      size="sm"
      title={titleWithIcon}
      description={description}
      footer={
        <>
          <Button variant="outline" size="sm" disabled={loading} onClick={onClose}>
            {cancelText}
          </Button>
          <Button variant={confirmButtonVariant} size="sm" loading={loading} onClick={onConfirm}>
            {confirmText}
          </Button>
        </>
      }
    >
      {children}
    </Modal>
  );
}
