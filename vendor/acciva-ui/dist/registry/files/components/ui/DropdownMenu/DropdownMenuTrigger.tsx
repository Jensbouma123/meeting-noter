"use client";

import { isValidElement, type CSSProperties, type KeyboardEvent, type ReactElement } from "react";
import { useDropdownMenuContext } from "@/components/ui/DropdownMenu/DropdownMenuContext";

function assignRef<T>(ref: React.Ref<T> | undefined, value: T) {
  if (!ref) return;
  if (typeof ref === "function") {
    ref(value);
  } else if (typeof ref === "object" && "current" in ref) {
    (ref as React.MutableRefObject<T>).current = value;
  }
}

export interface DropdownMenuTriggerProps {
  children: ReactElement<{
    ref?: React.Ref<HTMLElement>;
    onClick?: (e: React.MouseEvent) => void;
    onKeyDown?: (e: KeyboardEvent) => void;
    onPointerDown?: (e: React.PointerEvent) => void;
    style?: CSSProperties;
  }>;
}

export function DropdownMenuTrigger({ children }: DropdownMenuTriggerProps) {
  const { open, setOpen, triggerRef, contentId, triggerId, anchorName, openAtPointerDownRef, openLastRef } =
    useDropdownMenuContext("DropdownMenuTrigger");

  if (!isValidElement(children)) return children;

  const child = children as ReactElement<Record<string, unknown>>;
  const childProps = child.props as {
    ref?: React.Ref<HTMLElement>;
    onClick?: (e: React.MouseEvent) => void;
    onKeyDown?: (e: KeyboardEvent) => void;
    onPointerDown?: (e: React.PointerEvent) => void;
    style?: CSSProperties;
  };

  const Component = child.type as React.ElementType;

  return (
    <Component
      {...childProps}
      ref={(node: HTMLElement | null) => {
        triggerRef.current = node;
        assignRef(childProps.ref, node);
      }}
      id={triggerId}
      aria-haspopup="menu"
      aria-expanded={open}
      aria-controls={open ? contentId : undefined}
      style={{ ...childProps.style, anchorName }}
      onPointerDown={(e: React.PointerEvent) => {
        childProps.onPointerDown?.(e);
        openAtPointerDownRef.current = open;
      }}
      onClick={(e: React.MouseEvent) => {
        childProps.onClick?.(e);
        // A pointer press on the trigger of an open menu already light-dismissed it: don't reopen.
        const wasOpen = openAtPointerDownRef.current ?? open;
        openAtPointerDownRef.current = null;
        setOpen(!wasOpen);
      }}
      onKeyDown={(e: KeyboardEvent) => {
        childProps.onKeyDown?.(e);
        if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openLastRef.current = e.key === "ArrowUp";
          setOpen(true);
        }
      }}
    />
  );
}
