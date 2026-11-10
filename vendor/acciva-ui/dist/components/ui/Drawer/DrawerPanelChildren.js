"use client";
import { jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { DrawerHandle, DrawerSwipeGrabber } from "./DrawerGrabbers.js";
import { DrawerContent } from "./DrawerParts.js";
/** The panel's affordance and content nodes, in the order the resolved side requires. */
export function DrawerPanelChildren({ model, readout, draggable, safeAreaPadding, handleLabel, contentRef, innerContentRef, children, }) {
    const { detentSizes, detentControl, drag, swipe, isPersistent, isVertical, resolvedSide, dragEnabled } = model;
    const handleNode = !draggable ? null : (_jsx(DrawerHandle, { isVertical: isVertical, isPersistent: isPersistent, dragEnabled: dragEnabled, orientation: readout.handleOrientation, label: handleLabel ?? readout.defaultHandleLabel, valueText: readout.valueText, valueMin: Math.round(detentSizes.peek), valueMax: Math.round(detentSizes.full), valueNow: readout.reportedSize, drag: drag, keyboard: detentControl }, "handle"));
    const swipeNode = !model.showSwipeGrabber ? null : (_jsx(DrawerSwipeGrabber, { isVertical: isVertical, isPersistent: isPersistent, label: handleLabel ?? "Dismiss drawer", onDismiss: model.requestClose, swipe: swipe }, "swipe-grabber"));
    const contentNode = (_jsx(DrawerContent, { contentRef: contentRef, innerContentRef: innerContentRef, isVertical: isVertical, barVisible: readout.barVisible, safeAreaPadding: safeAreaPadding, children: children }, "content"));
    // Single-affordance selection, not a mode switch: the slider carries both
    // gestures in combined mode, the grabber only when there is no slider.
    const affordanceNode = draggable ? handleNode : swipeNode;
    const panelChildren = !affordanceNode
        ? [contentNode]
        : resolvedSide === "left"
            ? [contentNode, affordanceNode]
            : [affordanceNode, contentNode];
    return _jsx(_Fragment, { children: panelChildren });
}
