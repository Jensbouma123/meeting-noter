import { describe, expect, it } from 'vitest';
import { callAudioHint } from './call-audio-hint';
import type { CaptureDiagnostics } from './types/capture';

function diag(over: Partial<CaptureDiagnostics>): CaptureDiagnostics {
  return {
    mode: 'both',
    contextState: 'running',
    contextSampleRate: 48000,
    displaySurface: null,
    shareError: null,
    callAudioUnsupported: false,
    micCancelsEcho: false,
    micReopens: 0,
    shareSilent: false,
    sources: {},
    ...over,
  };
}

describe('callAudioHint', () => {
  it('points a silent screen or window share at the macOS System Audio Recording permission', () => {
    expect(callAudioHint(diag({ shareSilent: true, displaySurface: 'monitor' }))).toMatch(/System Audio Recording/);
    expect(callAudioHint(diag({ shareSilent: true, displaySurface: 'window' }))).toMatch(/shared window/);
  });

  it('points a silent tab share at the meeting tab and its audio toggle', () => {
    const hint = callAudioHint(diag({ shareSilent: true, displaySurface: 'browser' }));
    expect(hint).toMatch(/Also share tab audio/);
    expect(hint).not.toMatch(/System Audio Recording/);
  });

  it('tells Safari users the browser does not share call audio, without Chrome-only toggles', () => {
    const hint = callAudioHint(diag({ callAudioUnsupported: true, shareError: 'Safari does not share call audio' }));
    expect(hint).toMatch(/Safari does not share call audio with web pages/);
    expect(hint).toMatch(/Chrome or Edge/);
  });

  it('points Safari users at the system audio helper', () => {
    const hint = callAudioHint(diag({ callAudioUnsupported: true, shareError: 'Safari does not share call audio' }));
    expect(hint).toMatch(/npm run helper/);
  });

  it('points a silent helper at its System Audio Recording permission, not a share toggle', () => {
    const hint = callAudioHint(diag({ systemVia: 'helper', shareSilent: true }));
    expect(hint).toMatch(/audio helper hears nothing/);
    expect(hint).toMatch(/System Audio Recording/);
    expect(hint).not.toMatch(/Also share/);
  });

  it('asks for a share with audio when none attached', () => {
    expect(callAudioHint(diag({ shareError: 'Call audio: NotAllowedError' }))).toMatch(/Also share system audio/);
    expect(callAudioHint(null)).toMatch(/Also share tab audio/);
  });
});
