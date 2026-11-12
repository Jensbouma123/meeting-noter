/**
 * First-run onboarding state: shown once, then remembered in `localStorage`.
 * `?onboarding=1` in the URL forces it open (for testing), and Settings
 * reopens it through `openOnboarding()`.
 */
import { useSyncExternalStore } from 'react';

export const ONBOARDING_STORAGE_KEY = 'mn.onboarding.done';

let reopened = false;
let finished = false;
const listeners = new Set<() => void>();

function emit(): void {
  for (const fn of listeners) fn();
}

function forcedByUrl(): boolean {
  try {
    return new URLSearchParams(window.location.search).get('onboarding') === '1';
  } catch {
    return false;
  }
}

function isDone(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_STORAGE_KEY) === '1';
  } catch {
    // No storage: ask once per page load rather than on every render.
    return finished;
  }
}

export function shouldShowOnboarding(): boolean {
  if (typeof window === 'undefined') return false;
  return reopened || (forcedByUrl() && !finished) || !isDone();
}

/** Mark onboarding as seen (finished or skipped) and close it. */
export function finishOnboarding(): void {
  reopened = false;
  finished = true;
  try {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, '1');
  } catch {
    // Ignore — it will show again next load.
  }
  emit();
}

/** Reopen the welcome tour. */
export function openOnboarding(): void {
  reopened = true;
  emit();
}

/**
 * Settings → Restart onboarding: clear the done flag and open at step 1.
 * The user's saved words and name are untouched, so the steps show them.
 */
export function restartOnboarding(): void {
  finished = false;
  try {
    localStorage.removeItem(ONBOARDING_STORAGE_KEY);
  } catch {
    // Ignore — `reopened` below still opens it for this page.
  }
  reopened = true;
  emit();
}

export function resetOnboardingForTests(): void {
  reopened = false;
  finished = false;
  emit();
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useOnboardingOpen(): boolean {
  return useSyncExternalStore(subscribe, shouldShowOnboarding, () => false);
}
