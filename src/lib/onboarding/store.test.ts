// @vitest-environment jsdom
import { renderHook, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ASSISTANT_SEEN_STORAGE_KEY,
  ONBOARDING_STORAGE_KEY,
  finishAssistantOnboarding,
  finishOnboarding,
  openOnboarding,
  resetOnboardingForTests,
  restartOnboarding,
  shouldShowAssistantOnboarding,
  shouldShowOnboarding,
  useOnboardingOpen,
} from './store';

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState({}, '', '/');
  resetOnboardingForTests();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('onboarding store', () => {
  it('shows on first run, when nothing was recorded', () => {
    expect(shouldShowOnboarding()).toBe(true);
  });

  it('finishing records the flag, so the next page load stays closed', () => {
    finishOnboarding();
    expect(localStorage.getItem(ONBOARDING_STORAGE_KEY)).toBe('1');
    resetOnboardingForTests();
    expect(shouldShowOnboarding()).toBe(false);
  });

  it('a stored flag from an earlier run hides it on the next load', () => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, '1');
    expect(shouldShowOnboarding()).toBe(false);
  });

  it('only the exact value "1" counts as done', () => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    expect(shouldShowOnboarding()).toBe(true);
  });

  it('?onboarding=1 forces it open even when done, but finishing it closes it again', () => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, '1');
    window.history.replaceState({}, '', '/?onboarding=1');
    expect(shouldShowOnboarding()).toBe(true);
    finishOnboarding();
    expect(shouldShowOnboarding()).toBe(false);
  });

  it('openOnboarding reopens it after it was finished, and finishing closes it', () => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, '1');
    openOnboarding();
    expect(shouldShowOnboarding()).toBe(true);
    finishOnboarding();
    expect(shouldShowOnboarding()).toBe(false);
  });

  it('restart clears the flag and opens; finishing it again sets the flag again', () => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, '1');
    restartOnboarding();
    expect(localStorage.getItem(ONBOARDING_STORAGE_KEY)).toBeNull();
    expect(shouldShowOnboarding()).toBe(true);
    finishOnboarding();
    expect(localStorage.getItem(ONBOARDING_STORAGE_KEY)).toBe('1');
  });

  it('without storage it asks once per page load, not on every read', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(shouldShowOnboarding()).toBe(true);
    finishOnboarding();
    expect(shouldShowOnboarding()).toBe(false);
  });

  it('useOnboardingOpen follows finish and reopen', () => {
    const { result } = renderHook(() => useOnboardingOpen());
    expect(result.current).toBe(true);
    act(() => finishOnboarding());
    expect(result.current).toBe(false);
    act(() => openOnboarding());
    expect(result.current).toBe(true);
  });

  it('assistant onboarding shows for a finished user who never saw it, then never again', () => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, '1');
    expect(shouldShowAssistantOnboarding()).toBe(true);
    finishAssistantOnboarding();
    expect(localStorage.getItem(ASSISTANT_SEEN_STORAGE_KEY)).toBe('1');
    resetOnboardingForTests();
    expect(shouldShowAssistantOnboarding()).toBe(false);
  });

  it('assistant onboarding waits while the full onboarding is open, and finishing it counts as seen', () => {
    expect(shouldShowAssistantOnboarding()).toBe(false);
    finishOnboarding();
    expect(shouldShowAssistantOnboarding()).toBe(false);
  });
});
