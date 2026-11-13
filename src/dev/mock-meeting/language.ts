import { MOCK_LANG_NAMES } from './constants';
import { isRunning, simulation, updateState } from './simulation-state';

const DETECT_DELAY_MS = 3000;
const LOCK_DELAY_MS = 2500;

export function clearLangTimer(): void {
  if (simulation.langTimer) {
    clearTimeout(simulation.langTimer);
    simulation.langTimer = null;
  }
}

export function scheduleMockLanguage(): void {
  clearLangTimer();
  simulation.langTimer = setTimeout(() => {
    if (!isRunning()) return;
    updateState({
      language: { code: 'nl', name: 'Nederlands', locked: false, confidence: 0.62 },
    });
    simulation.langTimer = setTimeout(() => {
      if (!isRunning()) return;
      updateState({
        language: { code: 'nl', name: 'Nederlands', locked: true, confidence: 0.93 },
      });
      simulation.langTimer = null;
    }, LOCK_DELAY_MS);
  }, DETECT_DELAY_MS);
}

export function setMockLanguage(code: string): void {
  if (!isRunning()) return;
  clearLangTimer();
  if (code === 'auto') {
    updateState({
      language: { code: 'nl', name: 'Nederlands', locked: false, confidence: 0.55 },
    });
    simulation.langTimer = setTimeout(() => {
      if (!isRunning()) return;
      updateState({
        language: { code: 'nl', name: 'Nederlands', locked: true, confidence: 0.91 },
      });
      simulation.langTimer = null;
    }, LOCK_DELAY_MS);
    return;
  }
  updateState({
    language: { code, name: MOCK_LANG_NAMES[code] ?? code, locked: true, confidence: 1 },
  });
}
