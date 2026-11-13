'use client';

import { Alert, Button, Modal, VStack } from '@jensbouma123/acciva-ui';
import { Copy } from 'lucide-react';
import { useState } from 'react';
import { useT } from '@/lib/i18n/useT';
import { copyToClipboard, downloadFile } from '@/lib/meeting/export-browser';
import { exportFilename, formatExport, formatMeta } from '@/lib/meeting/export-formats';
import { finalSegments } from '@/lib/meeting/transcript-format';
import { type ExportFormat } from '@/lib/meeting/types/export';
import type { Segment, Speaker } from '@/lib/meeting/types';

export interface ShareDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  segments: Segment[];
  speakers: Record<string, Speaker>;
}

export function ShareDialog({ open, onClose, title, segments, speakers }: ShareDialogProps) {
  const t = useT('share');
  const [message, setMessage] = useState<'copied' | 'failed' | null>(null);
  const transcript = finalSegments(segments);
  const hasTranscript = transcript.length > 0;
  const copy = async (text: string) => setMessage(await copyToClipboard(text) ? 'copied' : 'failed');
  const download = (format: ExportFormat, text: string) => {
    const meta = formatMeta(format);
    downloadFile(exportFilename(title, meta.extension), text, meta.mime);
  };
  const transcriptText = (format: ExportFormat) => formatExport(format, transcript, speakers, title);
  const mailto = `mailto:?subject=${encodeURIComponent(t('emailSubject').replace('{title}', title))}&body=${encodeURIComponent(transcriptText('txt'))}`;
  const linkClass = 'text-sm underline underline-offset-2 hover:no-underline focus-visible:outline focus-visible:outline-2 cursor-pointer bg-transparent border-0 p-0';

  return <Modal open={open} onClose={onClose} title={t('title')} size="md" footer={<Button variant="ghost" onClick={onClose}>{t('close')}</Button>}>
    {!hasTranscript ? <p className="text-sm text-muted-foreground">{t('noTranscript')}</p> : <VStack spacing="md" className="w-full">
      <section aria-label={t('previewLabel')} className="max-h-72 w-full overflow-y-auto rounded-md border border-border p-4 text-sm" tabIndex={0}>
        <pre className="whitespace-pre-wrap font-sans">{transcriptText('txt')}</pre>
      </section>
      <Button variant="primary" size="lg" className="w-full justify-center" leadingIcon={<Copy className="size-4" aria-hidden="true" />} onClick={() => void copy(transcriptText('txt'))}>{t('copyTranscript')}</Button>
      <div aria-live="polite">
        {message === 'copied' && <p role="status" className="text-sm">{t('copied')}</p>}
        {message === 'failed' && <Alert variant="danger" layout="inline">{t('copyFailed')}</Alert>}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <button type="button" className={linkClass} onClick={() => download('markdown', transcriptText('markdown'))}>{t('downloadDoc')}</button>
        <a className={linkClass} href={mailto}>{t('sendEmail')}</a>
      </div>
      <details className="w-full text-sm">
        <summary className="cursor-pointer">{t('advanced')}</summary>
        <p className="mt-2 text-muted-foreground">{t('advancedHint')}</p>
        <ul className="mt-2 flex flex-col gap-2">
          {([
            ['txt', t('transcriptText'), () => transcriptText('txt'), 'txt'],
            ['srt', t('subtitles'), () => transcriptText('srt'), 'srt'],
          ] as const).map(([key, label, text, format]) => <li key={key} className="flex flex-wrap items-center gap-3">
            <span>{label}</span>
            <button type="button" className={linkClass} disabled={!hasTranscript} aria-label={`${t('copy')}: ${label}`} onClick={() => void copy(text())}>{t('copy')}</button>
            <button type="button" className={linkClass} disabled={!hasTranscript} aria-label={`${t('download')}: ${label}`} onClick={() => download(format, text())}>{t('download')}</button>
          </li>)}
          <li className="flex flex-wrap items-center gap-3">
            <span>{t('markdown')}</span>
            <button type="button" className={linkClass} disabled={!hasTranscript} aria-label={`${t('copy')}: ${t('markdown')}`} onClick={() => void copy(transcriptText('markdown'))}>{t('copy')}</button>
            <button type="button" className={linkClass} disabled={!hasTranscript} aria-label={`${t('download')}: ${t('markdown')}`} onClick={() => download('markdown', transcriptText('markdown'))}>{t('download')}</button>
          </li>
        </ul>
      </details>
    </VStack>}
  </Modal>;
}
