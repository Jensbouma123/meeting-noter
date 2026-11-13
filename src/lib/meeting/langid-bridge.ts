import { isConsentGiven, getModelStatus } from '@/lib/asr/browser';
import { createLanguageDetector } from '@/lib/langid';
import type { LanguageDetector } from '@/lib/langid/types';
import { languageNameFor } from '@/lib/langid/languages';
import { createLanguageSwitcher } from '@/lib/langid/decision';
import { setAsrLanguageHint } from '@/lib/asr/browser/language-hint';
import type { Source } from './types';
import { getState, setState } from './store';
import { int16ToFloat32 } from './pcm';
import { LANGID_REGISTRY_KEY } from './langid-registry';

const activeDetectors = new Map<Source, LanguageDetector>();
let languageLocked = false;
let activeSources: Source[] = [];
const switcher = createLanguageSwitcher();

function applyDetection(code: string, confidence: number): void {
  const accepted = switcher.offer({ code, confidence });
  if (languageLocked || !accepted) return;
  setState({ language: { code: accepted.code, name: languageNameFor(accepted.code), locked: false, confidence: accepted.confidence } });
}

export function startLangId(sources: readonly Source[]): void {
  activeSources = [...sources];
  if (languageLocked) return;
  const entry = getModelStatus(LANGID_REGISTRY_KEY);
  const available = entry?.status === 'cached' && isConsentGiven(LANGID_REGISTRY_KEY);
  if (!available) return;

  for (const source of sources) {
    if (activeDetectors.has(source)) continue;
    const detector = createLanguageDetector();
    detector.onLanguage(({ code, confidence }) => applyDetection(code, confidence));
    detector.onError((message) => {
      console.warn(`[langid:${source}] ${message}`);
    });
    activeDetectors.set(source, detector);
  }
}

export function pushLangIdAudio(source: Source, pcm: ArrayBuffer): void {
  const detector = activeDetectors.get(source);
  if (!detector) return;
  detector.push(int16ToFloat32(pcm), true);
}

export function stopLangIdForSource(source: Source): void {
  const detector = activeDetectors.get(source);
  if (detector) {
    detector.dispose();
    activeDetectors.delete(source);
  }
  activeSources = activeSources.filter((s) => s !== source);
}

export function stopLangId(): void {
  for (const detector of activeDetectors.values()) detector.dispose();
  activeDetectors.clear();
  activeSources = [];
  switcher.reset();
}

function releaseOverrideToDetection(): void {
  languageLocked = false;
  setAsrLanguageHint(null);
  const best = switcher.current;
  const current = getState().language;
  if (best) {
    setState({ language: { code: best.code, name: languageNameFor(best.code), locked: false, confidence: best.confidence } });
  } else if (current?.locked) {
    setState({ language: { ...current, locked: false } });
  }
  if (activeSources.length > 0) startLangId(activeSources);
}

export function setLanguageOverride(code: string): void {
  if (code === 'auto') {
    releaseOverrideToDetection();
    return;
  }
  languageLocked = true;
  setAsrLanguageHint(code);
  setState({ language: { code, name: languageNameFor(code), locked: true, confidence: 1 } });
}

export function resetLanguageOverride(): void {
  languageLocked = false;
  switcher.reset();
  setAsrLanguageHint(null);
}
