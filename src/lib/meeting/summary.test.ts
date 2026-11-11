import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n';
import { buildSummary } from './summary';

const translate = (language: 'en' | 'nl') => (key: string) => t('summary', key, language);
const base = {
  title: 'Planning', date: '11 November 2026', durationS: 65,
  participants: ['Ari'], decisions: [{ id: 'd', text: 'Ship it' }],
  actions: [
    { id: 'a', text: 'Send notes', done: false },
    { id: 'b', text: 'Book room', done: true, ownerName: 'Ari', due: 'Friday' },
  ],
};

describe('buildSummary', () => {
  it.each(['md', 'txt'] as const)('includes all summary fields in %s', (format) => {
    const result = buildSummary({ ...base, format, t: translate('en') });
    for (const part of ['Planning', '11 November 2026', '1m 5s', 'Participants', 'Ari', 'Decisions', 'Ship it', 'Action items', '☐ Send notes', '☑ Book room (Ari · Friday)']) {
      expect(result).toContain(part);
    }
  });

  it('localizes section titles and only includes transcript when provided', () => {
    const without = buildSummary({ ...base, format: 'md', t: translate('nl') });
    expect(without).toContain('## Deelnemers');
    expect(without).toContain('## Besluiten');
    expect(without).toContain('## Actiepunten');
    expect(without).not.toContain('Transcript');
    const withTranscript = buildSummary({ ...base, transcript: 'Hello', format: 'txt', t: translate('en') });
    expect(withTranscript).toContain('Transcript\n\nHello');
  });

  it('omits empty list sections', () => {
    const result = buildSummary({ ...base, participants: [], decisions: [], actions: [], format: 'md', t: translate('en') });
    expect(result).not.toContain('Participants');
    expect(result).not.toContain('Decisions');
    expect(result).not.toContain('Action items');
  });
});
