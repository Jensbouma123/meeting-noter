import { describe, expect, it } from 'vitest';
import { ASK_ASSISTANTS, getAskAssistant, isAskAssistantId } from './assistants';
import { buildAskPrompt, mergeTurns } from './buildAskPrompt';
import { ASK_PRESET_IDS, presetInstruction } from './presets';
import { resolveAskTarget } from './resolveAskTarget';

describe('presetInstruction', () => {
  it('gives a distinct, non-empty instruction per preset and language', () => {
    for (const language of ['en', 'nl'] as const) {
      const texts = ASK_PRESET_IDS.map((id) => presetInstruction(id, language));
      expect(texts.every((text) => text.length > 20)).toBe(true);
      expect(new Set(texts).size).toBe(ASK_PRESET_IDS.length);
    }
    expect(presetInstruction('actions', 'nl')).toContain('actiepunten');
    expect(presetInstruction('all', 'en')).toMatch(/Summary.*Decisions.*Action items/);
  });
});

describe('buildAskPrompt', () => {
  const turns = [
    { speaker: 'Anna', text: 'Hello ' },
    { speaker: 'Anna', text: 'everyone.' },
    { speaker: 'Bob', text: '  ' },
    { speaker: 'Bob', text: 'We ship Friday.' },
  ];

  it('puts the instruction, title, date and speaker-labelled transcript in order', () => {
    const prompt = buildAskPrompt({ instruction: 'Do it.', title: 'Weekly', dateLabel: '20 Nov 2026', turns, language: 'en' });
    expect(prompt).toBe(
      ['Do it.', '', 'Meeting: Weekly', 'Date: 20 Nov 2026', '', 'Transcript:', 'Anna: Hello everyone.', 'Bob: We ship Friday.'].join('\n'),
    );
  });

  it('uses localized labels, falls back on an untitled name and drops an empty date', () => {
    const prompt = buildAskPrompt({ instruction: 'Doe het.', title: ' ', dateLabel: '', turns, language: 'nl' });
    expect(prompt).toContain('Meeting: Naamloze meeting');
    expect(prompt).not.toContain('Datum');
  });

  it('merges consecutive turns of one speaker and skips empty text', () => {
    expect(mergeTurns(turns)).toEqual([
      { speaker: 'Anna', text: 'Hello everyone.' },
      { speaker: 'Bob', text: 'We ship Friday.' },
    ]);
  });
});

describe('resolveAskTarget', () => {
  const prefillBases: Record<string, string> = {
    claude: 'https://claude.ai/new?q=',
    chatgpt: 'https://chatgpt.com/?q=',
    copilot: 'https://copilot.microsoft.com/?q=',
    perplexity: 'https://www.perplexity.ai/search?q=',
  };

  it('prefills the encoded prompt for assistants that support it', () => {
    for (const [id, base] of Object.entries(prefillBases)) {
      if (!isAskAssistantId(id)) throw new Error(id);
      expect(resolveAskTarget(getAskAssistant(id), 'a & b?')).toEqual({ url: `${base}a%20%26%20b%3F`, prefilled: true });
    }
  });

  it('opens a plain new chat for assistants without a prefill URL', () => {
    expect(resolveAskTarget(getAskAssistant('gemini'), 'hi')).toEqual({
      url: 'https://gemini.google.com/app',
      prefilled: false,
    });
    expect(resolveAskTarget(getAskAssistant('mistral'), 'hi').prefilled).toBe(false);
  });

  it('falls back to the new-chat URL once the encoded prompt exceeds the limit', () => {
    const claude = getAskAssistant('claude');
    expect(resolveAskTarget(claude, 'x'.repeat(6000)).prefilled).toBe(true);
    expect(resolveAskTarget(claude, 'x'.repeat(6001))).toEqual({ url: 'https://claude.ai/new', prefilled: false });
    expect(resolveAskTarget(claude, ' '.repeat(2001)).prefilled).toBe(false);
  });

  it('lists six assistants with unique ids', () => {
    expect(new Set(ASK_ASSISTANTS.map((a) => a.id)).size).toBe(6);
    expect(isAskAssistantId('bard')).toBe(false);
  });
});
