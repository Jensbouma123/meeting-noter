import { afterEach, beforeEach, vi } from 'vitest';
import { resetBridge, resetFakesAndRegistry } from './diarization-bridge-fakes';

vi.mock('@/lib/asr/browser', async (importOriginal) =>
  (await import('./diarization-bridge-fakes')).mockAsrBrowser(importOriginal),
);

vi.mock('@/lib/diarization/browser', async () => (await import('./diarization-bridge-fakes')).mockDiarizationBrowser());

beforeEach(resetFakesAndRegistry);

afterEach(resetBridge);
