"use client";

import { forwardRef, useId, useRef, useState, type MutableRefObject } from "react";
import { ICON_SIZE_CLASS, INPUT_ICON_INSET, TEXT_SIZE, resolveResponsive } from "@/lib/sizing-tokens/index";
import { DEFAULT_SEED } from "@/lib/theme-tokens/index";
import { cn } from "@/lib/utils";
import { VStack } from "@/components/ui/VStack";
import { ColorPanel } from "@/components/ui/ColorPicker/ColorPanel";
import { ColorPickerPopup } from "@/components/ui/ColorPicker/ColorPickerPopup";
import { triggerClassName } from "@/components/ui/ColorPicker/colorPickerClasses";
import { DOCKED_MEDIA_QUERY, checkeredFill } from "@/components/ui/ColorPicker/colorPickerUtils";
import type { ColorPickerProps } from "@/components/ui/ColorPicker/types";
import { useColorPickerValue } from "@/components/ui/ColorPicker/useColorPickerValue";

export const ColorPicker = forwardRef<HTMLButtonElement, ColorPickerProps>(function ColorPicker(
  {
    value,
    defaultValue = DEFAULT_SEED,
    onChange,
    format = "hex",
    allowAlpha = true,
    swatches,
    showEyeDropper = true,
    label,
    hint,
    error,
    required,
    disabled = false,
    readOnly = false,
    name,
    id,
    size = "md",
    className,
    onClick,
    onKeyDown,
    "aria-describedby": describedBy,
    ...rest
  },
  forwardedRef,
) {
  const generatedId = useId();
  const triggerId = id ?? generatedId;
  const labelId = `${triggerId}-label`;
  const valueId = `${triggerId}-value`;
  const hintId = hint && !error ? `${triggerId}-hint` : undefined;
  const errorId = error ? `${triggerId}-error` : undefined;
  const describedByIds = [describedBy, hintId, errorId].filter(Boolean).join(" ") || undefined;

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const { hsva, serialized, displayRgba, commit } = useColorPickerValue({
    value,
    defaultValue,
    onChange,
    format,
    allowAlpha,
  });
  const [surface, setSurface] = useState<"popover" | "drawer" | null>(null);

  const openPanel = () => {
    if (disabled || readOnly) return;
    setSurface(window.matchMedia(DOCKED_MEDIA_QUERY).matches ? "popover" : "drawer");
  };
  const closePanel = () => setSurface(null);

  const panel = (
    <ColorPanel
      hsva={hsva}
      format={format}
      allowAlpha={allowAlpha}
      swatches={swatches}
      showEyeDropper={showEyeDropper}
      onChange={commit}
    />
  );

  return (
    <VStack spacing="sm" className={cn("w-full", className)}>
      {label ? (
        <label id={labelId} htmlFor={triggerId} className={cn("font-medium text-foreground", resolveResponsive(size, TEXT_SIZE))}>
          {label}
          {required ? <span className="ml-0.5 text-danger">*</span> : null}
        </label>
      ) : null}

      {/* eslint-disable-next-line jsx-a11y/role-supports-aria-props -- trigger-button carries field error state (SC 3.3.1) via aria-invalid + aria-describedby to role=alert; hidden input is AT-invisible so it cannot carry it; same pattern as DatePicker trigger. */}
      <button
        {...rest}
        ref={(node) => {
          triggerRef.current = node;
          if (typeof forwardedRef === "function") forwardedRef(node);
          else if (forwardedRef) (forwardedRef as MutableRefObject<HTMLButtonElement | null>).current = node;
        }}
        id={triggerId}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={surface !== null}
        aria-labelledby={label ? `${labelId} ${valueId}` : rest["aria-labelledby"]}
        aria-describedby={describedByIds}
        aria-invalid={error ? true : undefined}
        onClick={(event) => {
          onClick?.(event);
          if (event.defaultPrevented) return;
          if (surface) closePanel();
          else openPanel();
        }}
        onKeyDown={(event) => {
          onKeyDown?.(event);
          if (event.key === "ArrowDown" && !surface) {
            event.preventDefault();
            openPanel();
          }
        }}
        className={triggerClassName(size, disabled, readOnly, error)}
      >
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute top-1/2 -translate-y-1/2 rounded-sm border border-border",
            resolveResponsive(size, INPUT_ICON_INSET),
            resolveResponsive(size, ICON_SIZE_CLASS),
          )}
          style={checkeredFill(displayRgba)}
        />
        <span id={valueId} className="truncate font-mono">{serialized}</span>
      </button>

      {name ? <input type="hidden" name={name} value={serialized} /> : null}

      {error ? (
        <p id={errorId} role="alert" className="text-xs font-medium text-danger animate-fade-in">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}

      <ColorPickerPopup surface={surface} panel={panel} triggerRef={triggerRef} onClose={closePanel} />
    </VStack>
  );
});
