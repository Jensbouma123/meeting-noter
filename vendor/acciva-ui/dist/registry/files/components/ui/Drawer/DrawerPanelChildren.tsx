"use client";

import type { ReactNode, RefObject } from "react";
import { DrawerHandle, DrawerSwipeGrabber } from "@/components/ui/Drawer/DrawerGrabbers";
import { DrawerContent } from "@/components/ui/Drawer/DrawerParts";
import { drawerReadout } from "@/components/ui/Drawer/drawerReadout";
import type { useDrawerModel } from "@/components/ui/Drawer/useDrawerModel";

interface DrawerPanelChildrenProps {
  model: ReturnType<typeof useDrawerModel>;
  readout: ReturnType<typeof drawerReadout>;
  draggable: boolean;
  safeAreaPadding: boolean;
  handleLabel: string | undefined;
  contentRef: RefObject<HTMLDivElement | null>;
  innerContentRef: RefObject<HTMLDivElement | null>;
  children: ReactNode;
}

/** The panel's affordance and content nodes, in the order the resolved side requires. */
export function DrawerPanelChildren({
  model,
  readout,
  draggable,
  safeAreaPadding,
  handleLabel,
  contentRef,
  innerContentRef,
  children,
}: DrawerPanelChildrenProps) {
  const { detentSizes, detentControl, drag, swipe, isPersistent, isVertical, resolvedSide, dragEnabled } = model;

  const handleNode = !draggable ? null : (
    <DrawerHandle
      key="handle"
      isVertical={isVertical}
      isPersistent={isPersistent}
      dragEnabled={dragEnabled}
      orientation={readout.handleOrientation}
      label={handleLabel ?? readout.defaultHandleLabel}
      valueText={readout.valueText}
      valueMin={Math.round(detentSizes.peek)}
      valueMax={Math.round(detentSizes.full)}
      valueNow={readout.reportedSize}
      drag={drag}
      keyboard={detentControl}
    />
  );

  const swipeNode = !model.showSwipeGrabber ? null : (
    <DrawerSwipeGrabber
      key="swipe-grabber"
      isVertical={isVertical}
      isPersistent={isPersistent}
      label={handleLabel ?? "Dismiss drawer"}
      onDismiss={model.requestClose}
      swipe={swipe}
    />
  );

  const contentNode = (
    <DrawerContent
      key="content"
      contentRef={contentRef}
      innerContentRef={innerContentRef}
      isVertical={isVertical}
      barVisible={readout.barVisible}
      safeAreaPadding={safeAreaPadding}
    >
      {children}
    </DrawerContent>
  );

  // Single-affordance selection, not a mode switch: the slider carries both
  // gestures in combined mode, the grabber only when there is no slider.
  const affordanceNode = draggable ? handleNode : swipeNode;
  const panelChildren = !affordanceNode
    ? [contentNode]
    : resolvedSide === "left"
      ? [contentNode, affordanceNode]
      : [affordanceNode, contentNode];

  return <>{panelChildren}</>;
}
