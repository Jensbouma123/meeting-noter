import type { ReactNode, RefObject } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button/index";
import { Modal, type DismissConfirmation } from "@/components/ui/Modal/index";

interface DrawerContentProps {
  contentRef: RefObject<HTMLDivElement | null>;
  innerContentRef: RefObject<HTMLDivElement | null>;
  isVertical: boolean;
  barVisible: boolean;
  safeAreaPadding: boolean;
  children: ReactNode;
}

/** The scrolling body. `barVisible` says a connected BottomNav is on screen and owns the bottom inset; `safeAreaPadding={false}` drops it for a host that pads itself. */
export function DrawerContent({ contentRef, innerContentRef, isVertical, barVisible, safeAreaPadding, children }: DrawerContentProps) {
  return (
    <div
      ref={contentRef}
      className={cn(
        "flex-1 overflow-y-auto px-4",
        isVertical ? "min-h-0" : "min-w-0 pt-4",
        // A drawer anchored to the viewport bottom has to clear the home indicator itself,
        // or its last control sits under the iOS indicator where a tap is swallowed as a
        // system swipe. Only a bar that is actually on screen removes that duty:
        // `useBottomNavHeight` measures the rendered bar and its own `pb-safe` is inside
        // that height, so adding the inset again would double-count it. The PROP alone is
        // not enough — `connectToBottomNav` with no bar mounted measures 0, which leaves
        // the panel at the viewport bottom with the indicator still to clear.
        barVisible || !safeAreaPadding ? "pb-4" : "pb-4-safe",
      )}
    >
      <div ref={innerContentRef} className="flow-root">{children}</div>
    </div>
  );
}

interface DrawerPersistentChromeProps {
  closeLabel: string;
  showCloseOnTouch: boolean;
  onClose: () => void;
  /** Announced politely when a persistent drawer is also draggable; omitted otherwise. */
  liveText?: string;
}

/** A persistent drawer's close control, pinned to the panel's inline-end corner, and its live readout. */
export function DrawerPersistentChrome({ closeLabel, showCloseOnTouch, onClose, liveText }: DrawerPersistentChromeProps) {
  return (
    <>
      <button
        type="button"
        onClick={onClose}
        aria-label={closeLabel}
        className={cn(
          "focus-ring absolute end-1 top-0 flex size-11 items-center justify-center rounded-full text-muted-foreground hover:text-foreground",
          !showCloseOnTouch && "touch-concealed",
        )}
      >
        <X className="size-5" />
      </button>
      {liveText !== undefined && (
        <span role="status" aria-live="polite" className="sr-only">
          {liveText}
        </span>
      )}
    </>
  );
}

interface DrawerDiscardPromptProps {
  dismissal: DismissConfirmation | undefined;
  open: boolean;
  onKeep: () => void;
  onDiscard: () => void;
}

/** Confirms a dismissal that would throw away unsaved edits. Renders nothing without `dismissal`. */
export function DrawerDiscardPrompt({ dismissal, open, onKeep, onDiscard }: DrawerDiscardPromptProps) {
  if (!dismissal) return null;
  return (
    <Modal
      open={open}
      onClose={onKeep}
      role="alertdialog"
      size="sm"
      title={dismissal.title}
      description={dismissal.message}
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onKeep}>
            {dismissal.keepLabel ?? "Keep editing"}
          </Button>
          <Button variant="danger" size="sm" onClick={onDiscard}>
            {dismissal.discardLabel ?? "Discard"}
          </Button>
        </>
      }
    />
  );
}
