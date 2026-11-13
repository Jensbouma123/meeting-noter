import type { Language } from '@/lib/i18n/types';

export function defaultMeetingName(language: Language): string {
  const now = new Date();
  const date = new Intl.DateTimeFormat(language === 'nl' ? 'nl-NL' : 'en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(now);
  const time = new Intl.DateTimeFormat(language === 'nl' ? 'nl-NL' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(now);
  return `Meeting ${date}, ${time}`;
}
