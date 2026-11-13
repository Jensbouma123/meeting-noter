import type { BuildSummaryOptions } from './types/summary';

function duration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remaining = total % 60;
  if (hours) return `${hours}h ${minutes}m`;
  if (minutes) return `${minutes}m ${remaining}s`;
  return `${remaining}s`;
}

export function buildSummary(options: BuildSummaryOptions): string {
  const { title, date, durationS, participants, decisions, actions, transcript, format, t } = options;
  const markdown = format === 'md';
  const lines = [markdown ? `# ${title}` : title, '', `${date} · ${duration(durationS)}`, ''];
  const section = (heading: string, entries: readonly string[]) => {
    if (!entries.length) return;
    lines.push(markdown ? `## ${heading}` : heading, '', ...entries, '');
  };
  section(t('participants'), participants);
  section(t('decisions'), decisions.map((decision) => `- ${decision.text}`));
  section(t('actions'), actions.map((action) => {
    const mark = action.done ? '☑' : '☐';
    const details = [action.ownerName, action.due].filter(Boolean).join(' · ');
    return `- ${mark} ${action.text}${details ? ` (${details})` : ''}`;
  }));
  if (transcript !== undefined) section(t('transcript'), [transcript]);
  return lines.join('\n').trimEnd() + '\n';
}
