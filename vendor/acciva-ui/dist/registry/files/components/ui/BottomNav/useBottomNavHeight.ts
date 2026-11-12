"use client";

import { useSyncExternalStore } from "react";

let bottomNavHeightPx = 0;
const listeners = new Set<() => void>();

export function publishBottomNavHeight(height: number) {
  if (height === bottomNavHeightPx) return;
  bottomNavHeightPx = height;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return bottomNavHeightPx;
}

function getServerSnapshot() {
  return 0;
}

/** Lets a Drawer anchor above the on-screen BottomNav instead of the viewport bottom. */
export function useBottomNavHeight(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
