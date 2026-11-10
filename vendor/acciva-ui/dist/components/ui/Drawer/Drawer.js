"use client";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useRef } from "react";
import { useKeyboardInset } from "../../../lib/use-keyboard-inset.js";
import { DrawerDiscardPrompt, DrawerPersistentChrome } from "./DrawerParts.js";
import { DrawerPanelChildren } from "./DrawerPanelChildren.js";
import { panelClassName } from "./drawerClasses.js";
import { drawerReadout } from "./drawerReadout.js";
import { dismissOnOutsideClick, supportsClosedBy } from "./lightDismiss.js";
import { useDrawerModel } from "./useDrawerModel.js";
export function Drawer(props) {
    const wrapperRef = useRef(null);
    const sheetRef = useRef(null);
    const contentRef = useRef(null);
    const innerContentRef = useRef(null);
    const { open, onOpenChange, children, connectToBottomNav = false, safeAreaPadding = true, draggable = false, handleLabel, closeLabel, confirmDismissal, showCloseOnTouch = false, className, "aria-label": ariaLabel, "aria-labelledby": ariaLabelledBy, } = props;
    const model = useDrawerModel(props, { wrapperRef, sheetRef, contentRef, innerContentRef });
    const { detent, detentSizes, isPersistent, isVertical, resolvedSide } = model;
    // Re-anchors the panel above the on-screen keyboard (iOS focus pan, SC 2.4.11).
    useKeyboardInset(sheetRef, open);
    if (!open && !model.mounted)
        return null;
    const readout = drawerReadout(model.dragSize, model.restSize, detentSizes, detent, model.docked, isVertical, draggable, model.sizeResolved, connectToBottomNav, model.bottomNavHeight);
    const insetBottom = readout.insetBottom;
    return (_jsxs(_Fragment, { children: [_jsx("div", { ref: wrapperRef, "aria-hidden": "true", className: "pointer-events-none invisible fixed inset-x-0 top-0", style: { bottom: insetBottom } }), _jsxs("dialog", { ref: sheetRef, popover: isPersistent ? "manual" : undefined, "aria-label": ariaLabel, "aria-labelledby": ariaLabelledBy, tabIndex: -1, "aria-hidden": !open || undefined, "data-side": resolvedSide, "data-persistent": isPersistent || undefined, onCancel: (event) => {
                    if (event.target !== event.currentTarget)
                        return;
                    event.preventDefault();
                    model.requestClose();
                }, 
                // Light dismiss for browsers without `closedby` (Safari): a click on the dialog
                // element itself but outside its box landed on the ::backdrop.
                onClick: isPersistent || supportsClosedBy()
                    ? undefined
                    : (event) => dismissOnOutsideClick(event, model.requestClose), closedby: isPersistent ? undefined : "any", style: { ...readout.sizeStyle, "--drawer-inset-bottom": `${insetBottom}px` }, className: panelClassName(open, model.entered, model.settled, readout.isDragging, isVertical, isPersistent, resolvedSide, detent, className), children: [_jsx(DrawerPanelChildren, { model: model, readout: readout, draggable: draggable, safeAreaPadding: safeAreaPadding, handleLabel: handleLabel, contentRef: contentRef, innerContentRef: innerContentRef, children: children }), isPersistent && (_jsx(DrawerPersistentChrome, { closeLabel: closeLabel ?? "Close", showCloseOnTouch: showCloseOnTouch, onClose: model.requestClose, liveText: draggable ? readout.valueText : undefined }))] }), _jsx(DrawerDiscardPrompt, { dismissal: confirmDismissal, open: model.confirmingDiscard, onKeep: () => model.setConfirmingDiscard(false), onDiscard: () => {
                    model.setConfirmingDiscard(false);
                    onOpenChange(false);
                } })] }));
}
