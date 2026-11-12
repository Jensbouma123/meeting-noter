"use client";

import { useRef, type CSSProperties } from "react";
import { useKeyboardInset } from "@/lib/use-keyboard-inset";
import { DrawerDiscardPrompt, DrawerPersistentChrome } from "@/components/ui/Drawer/DrawerParts";
import { DrawerPanelChildren } from "@/components/ui/Drawer/DrawerPanelChildren";
import { panelClassName } from "@/components/ui/Drawer/drawerClasses";
import { drawerReadout } from "@/components/ui/Drawer/drawerReadout";
import { dismissOnOutsideClick, supportsClosedBy } from "@/components/ui/Drawer/lightDismiss";
import { useDrawerModel } from "@/components/ui/Drawer/useDrawerModel";
import type { DrawerProps } from "@/components/ui/Drawer/types";

export function Drawer(props: DrawerProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDialogElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const innerContentRef = useRef<HTMLDivElement>(null);
  const {
    open,
    onOpenChange,
    children,
    connectToBottomNav = false,
    safeAreaPadding = true,
    draggable = false,
    handleLabel,
    closeLabel,
    confirmDismissal,
    showCloseOnTouch = false,
    className,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
  } = props;
  const model = useDrawerModel(props, { wrapperRef, sheetRef, contentRef, innerContentRef });
  const { detent, detentSizes, isPersistent, isVertical, resolvedSide } = model;
  // Re-anchors the panel above the on-screen keyboard (iOS focus pan, SC 2.4.11).
  useKeyboardInset(sheetRef, open);

  if (!open && !model.mounted) return null;

  const readout = drawerReadout(
    model.dragSize, model.restSize, detentSizes, detent, model.docked, isVertical, draggable,
    model.sizeResolved, connectToBottomNav, model.bottomNavHeight,
  );

  const insetBottom = readout.insetBottom;

  return (
    <>
      {/* Invisible box over the area the panel may occupy (viewport minus a connected
          BottomNav): the reference `resolveLength` measures `%` and CSS lengths against. */}
      <div
        ref={wrapperRef}
        aria-hidden="true"
        className="pointer-events-none invisible fixed inset-x-0 top-0"
        style={{ bottom: insetBottom }}
      />
      <dialog
        ref={sheetRef}
        popover={isPersistent ? "manual" : undefined}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        tabIndex={-1}
        // Closed in state, only still on screen for its exit slide.
        aria-hidden={!open || undefined}
        data-side={resolvedSide}
        data-persistent={isPersistent || undefined}
        onCancel={(event) => {
          if (event.target !== event.currentTarget) return;
          event.preventDefault();
          model.requestClose();
        }}
        // Light dismiss for browsers without `closedby` (Safari): a click on the dialog
        // element itself but outside its box landed on the ::backdrop.
        onClick={
          isPersistent || supportsClosedBy()
            ? undefined
            : (event) => dismissOnOutsideClick(event, model.requestClose)
        }
        closedby={isPersistent ? undefined : "any"}
        style={{ ...readout.sizeStyle, "--drawer-inset-bottom": `${insetBottom}px` } as CSSProperties}
        className={panelClassName(
          open, model.entered, model.settled, readout.isDragging, isVertical, isPersistent, resolvedSide, detent,
          className,
        )}
      >
        <DrawerPanelChildren
          model={model}
          readout={readout}
          draggable={draggable}
          safeAreaPadding={safeAreaPadding}
          handleLabel={handleLabel}
          contentRef={contentRef}
          innerContentRef={innerContentRef}
        >
          {children}
        </DrawerPanelChildren>
        {isPersistent && (
          <DrawerPersistentChrome
            closeLabel={closeLabel ?? "Close"}
            showCloseOnTouch={showCloseOnTouch}
            onClose={model.requestClose}
            liveText={draggable ? readout.valueText : undefined}
          />
        )}
      </dialog>
      <DrawerDiscardPrompt
        dismissal={confirmDismissal}
        open={model.confirmingDiscard}
        onKeep={() => model.setConfirmingDiscard(false)}
        onDiscard={() => {
          model.setConfirmingDiscard(false);
          onOpenChange(false);
        }}
      />
    </>
  );
}
