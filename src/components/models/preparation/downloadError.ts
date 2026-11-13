import type { ParsedDownloadError } from './types';

export function parseDownloadError(raw: string | null): ParsedDownloadError {
  if (!raw) return { summary: 'error.download', filename: null };

  const match = raw.match(/Failed to download ([^:]+):\s*(\d{3})/);
  if (!match) return { summary: raw, filename: null };

  const [, filename, status] = match;
  const reason = status === '404' ? 'error.downloadNotFound' : `error.downloadServer:${status}`;
  return { summary: `error.downloadSummary:${reason}`, filename };
}

export function translatedDownloadError(raw: string | null, t: (key: string) => string) {
  const { summary, filename } = parseDownloadError(raw);
  const reason = summary.includes(':') ? summary.slice(summary.lastIndexOf(':') + 1) : null;
  if (summary === 'error.download') return { summary: t(summary), filename };
  if (reason?.startsWith('error.downloadServer:')) {
    const status = reason.slice('error.downloadServer:'.length);
    return { summary: t('error.downloadSummary').replace('{reason}', t('error.downloadServer').replace('{status}', status)), filename };
  }
  return { summary: t('error.downloadSummary').replace('{reason}', t(reason ?? 'error.downloadNotFound')), filename };
}
