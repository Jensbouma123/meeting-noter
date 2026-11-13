import { formatClock } from '@/lib/meeting/transcript-format';

export function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds <= 0) return '—';
  return formatClock(seconds);
}

export function formatTime(timestamp: number): string {
  const locale = typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('nl') ? 'nl-NL' : 'en-US';
  return new Date(timestamp).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}
