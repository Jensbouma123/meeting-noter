'use client';

import { useSyncExternalStore } from 'react';
import { applyUpdate, dismissUpdate } from './updateActions';
import { checkForUpdate } from './updateCheck';
import { subscribeToUpdate } from './updateSubscription';
import { getUpdateSnapshot, INITIAL_SNAPSHOT } from './updateState';

export function useUpdate(isRecording = false) {
  const state = useSyncExternalStore(subscribeToUpdate, getUpdateSnapshot, () => INITIAL_SNAPSHOT);

  return {
    ...state,
    blockedRecording: isRecording,
    dismiss: dismissUpdate,
    apply: applyUpdate,
    refresh: () => checkForUpdate(true),
  };
}
