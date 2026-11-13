import { useSyncExternalStore } from 'react';

export const ONBOARDING_STORAGE_KEY = 'mn.onboarding.done';

export const ASSISTANT_SEEN_STORAGE_KEY = 'mn.onboarding.assistant.seen';

let reopened = false;
let finished = false;
let assistantSeen = false;
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
    return finished;
  }
}

function isAssistantSeen(): boolean {
  try {
    return localStorage.getItem(ASSISTANT_SEEN_STORAGE_KEY) === '1';
  } catch {
    return assistantSeen;
  }
}

export function shouldShowAssistantOnboarding(): boolean {
  if (typeof window === 'undefined') return false;
  return !shouldShowOnboarding() && !isAssistantSeen();
}

export function finishAssistantOnboarding(): void {
  assistantSeen = true;
  try {
    localStorage.setItem(ASSISTANT_SEEN_STORAGE_KEY, '1');
  } catch {}
  emit();
}

export function shouldShowOnboarding(): boolean {
  if (typeof window === 'undefined') return false;
  return reopened || (forcedByUrl() && !finished) || !isDone();
}

export function finishOnboarding(): void {
  reopened = false;
  finished = true;
  assistantSeen = true;
  try {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, '1');
    localStorage.setItem(ASSISTANT_SEEN_STORAGE_KEY, '1');
  } catch {}
  emit();
}

export function openOnboarding(): void {
  reopened = true;
  emit();
}

export function restartOnboarding(): void {
  finished = false;
  try {
    localStorage.removeItem(ONBOARDING_STORAGE_KEY);
  } catch {}
  reopened = true;
  emit();
}

export function resetOnboardingForTests(): void {
  reopened = false;
  finished = false;
  assistantSeen = false;
  emit();
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useOnboardingOpen(): boolean {
  return useSyncExternalStore(subscribe, shouldShowOnboarding, () => false);
}

export function useAssistantOnboardingOpen(): boolean {
  return useSyncExternalStore(subscribe, shouldShowAssistantOnboarding, () => false);
}
