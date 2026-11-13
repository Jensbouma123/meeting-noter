import { vi } from 'vitest';
import { render } from '@testing-library/react';
import type { CaptureMode, Status } from '@/lib/meeting';
import { BottomDock } from './BottomDock';
import { NO_MODEL_PROGRESS } from './modelReadiness';
import { LanguageContext } from '@/lib/i18n/LanguageContext';

export function dockElement(
  status: Status,
  mode: CaptureMode,
  onModeChange: (m: CaptureMode) => void = () => {},
  onOpenAdvanced: () => void = () => {},
) {
  return (
    <LanguageContext.Provider value="nl">
      <BottomDock
        status={status}
        mode={mode}
        modelReadiness="ready"
        modelProgress={NO_MODEL_PROGRESS}
        onModeChange={onModeChange}
        onStart={() => {}}
        onStop={() => {}}
        onPause={() => {}}
        onResume={() => {}}
        onOpenAdvanced={onOpenAdvanced}
      />
    </LanguageContext.Provider>
  );
}

export function renderDock(mode: CaptureMode, onModeChange: (m: CaptureMode) => void = () => {}, onOpenAdvanced: () => void = () => {}) {
  render(dockElement('idle', mode, onModeChange, onOpenAdvanced));
}

export function renderDockWithStatus(status: Status, mode: CaptureMode) {
  return render(dockElement(status, mode));
}

export function renderDockState(status: Status, extra: Partial<Parameters<typeof BottomDock>[0]> = {}) {
  const handlers = { onStart: vi.fn(), onStop: vi.fn(), onPause: vi.fn(), onResume: vi.fn() };
  render(
    <LanguageContext.Provider value="nl">
      <BottomDock
        status={status}
        mode="both"
        modelReadiness="ready"
        modelProgress={NO_MODEL_PROGRESS}
        onModeChange={() => {}}
        onOpenAdvanced={() => {}}
        {...handlers}
        {...extra}
      />
    </LanguageContext.Provider>,
  );
  return handlers;
}
