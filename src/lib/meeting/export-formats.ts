import { toMarkdown, toPlainText, toSrt } from './export-writers';
import type { Segment, Speaker } from './types';
import type { ExportFormat, ExportOptions, FormatMeta } from './types/export';

export const EXPORT_FORMATS: FormatMeta[] = [
  { value: 'markdown', label: 'Markdown', extension: 'md', mime: 'text/markdown' },
  { value: 'txt', label: 'Plain text', extension: 'txt', mime: 'text/plain' },
  { value: 'srt', label: 'Subtitles (SRT)', extension: 'srt', mime: 'text/plain' },
];

export function formatExport(
  format: ExportFormat,
  segments: Segment[],
  speakers: Record<string, Speaker>,
  title: string,
  options: ExportOptions = {},
): string {
  switch (format) {
    case 'markdown':
      return toMarkdown(segments, speakers, title, options);
    case 'txt':
      return toPlainText(segments, speakers, title, options);
    case 'srt':
      return toSrt(segments, speakers, options.callAudioMissing);
  }
}

export function formatMeta(format: ExportFormat): FormatMeta {
  return EXPORT_FORMATS.find((f) => f.value === format) ?? EXPORT_FORMATS[1];
}

export function exportFilename(title: string, extension: string): string {
  const base = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `${base || 'meeting-notes'}.${extension}`;
}
