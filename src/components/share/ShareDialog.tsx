'use client';

import { Alert, Button, Modal, VStack } from '@jensbouma123/acciva-ui';
import { useState } from 'react';
import { useT } from '@/lib/i18n/useT';
import { buildSummary } from '@/lib/meeting/summary';
import type { ActionItem, Decision } from '@/lib/meeting/notes';
import { copyToClipboard, downloadFile, exportFilename, formatExport, formatMeta, finalSegments, toTranscriptBody, type ExportFormat } from '@/lib/meeting/export';
import type { Segment, Speaker } from '@/lib/meeting/types';

export interface ShareDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  date: string;
  durationS: number;
  participants: readonly string[];
  decisions: readonly Decision[];
  actions: readonly ActionItem[];
  segments: Segment[];
  speakers: Record<string, Speaker>;
}

export function ShareDialog({ open, onClose, title, date, durationS, participants, decisions, actions, segments, speakers }: ShareDialogProps) {
  const t = useT('share');
  const summaryT = useT('summary');
  const [message, setMessage] = useState<'copied' | 'failed' | null>(null);
  const transcript = finalSegments(segments);
  const hasTranscript = transcript.length > 0;
  const hasContent = hasTranscript || decisions.length > 0 || actions.length > 0;
  const build = (format: 'md' | 'txt', withTranscript = false) => buildSummary({ title, date, durationS, participants, decisions, actions, format, t: summaryT, transcript: withTranscript && hasTranscript ? toTranscriptBody(transcript, speakers) : undefined });
  const plain = build('txt');
  // Line 3 of the summary is "date · duration"; reuse it so the preview matches what is shared.
  const dateLine = plain.split('\n')[2] ?? date;
  const copy = async (text: string) => setMessage(await copyToClipboard(text) ? 'copied' : 'failed');
  const download = (format: ExportFormat, text: string) => {
    const meta = formatMeta(format);
    downloadFile(exportFilename(title, meta.extension), text, meta.mime);
  };
  const transcriptText = (format: ExportFormat) => formatExport(format, transcript, speakers, title);
  const mailto = `mailto:?subject=${encodeURIComponent(t('emailSubject').replace('{title}', title))}&body=${encodeURIComponent(plain)}`;
  const linkClass = 'text-sm underline underline-offset-2 hover:no-underline focus-visible:outline focus-visible:outline-2 cursor-pointer bg-transparent border-0 p-0';

  return <Modal open={open} onClose={onClose} title={t('title')} size="md" footer={<Button variant="ghost" onClick={onClose}>{t('close')}</Button>}>
    {!hasContent ? <p className="text-sm text-muted-foreground">{t('noTranscript')}</p> : <VStack spacing="md" className="w-full">
      <section aria-label={t('previewLabel')} className="max-h-72 w-full overflow-y-auto rounded-md border border-border p-4 text-sm" tabIndex={0}>
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="text-muted-foreground">{dateLine}</p>
        {decisions.length > 0 && <>
          <h4 className="mt-3 font-semibold">{summaryT('decisions')}</h4>
          <ul className="list-disc pl-5">{decisions.map((d) => <li key={d.id}>{d.text}</li>)}</ul>
        </>}
        {actions.length > 0 && <>
          <h4 className="mt-3 font-semibold">{summaryT('actions')}</h4>
          <ul className="pl-1">{actions.map((a) => <li key={a.id}>
            <span aria-hidden="true">{a.done ? '☑' : '☐'}</span> {a.text}
            {(a.ownerName || a.due) && <span className="text-muted-foreground"> ({[a.ownerName && `${t('owner')}: ${a.ownerName}`, a.due && `${t('due')}: ${a.due}`].filter(Boolean).join(' · ')})</span>}
          </li>)}</ul>
        </>}
        {decisions.length === 0 && actions.length === 0 && <p className="mt-3 text-muted-foreground">{t('noItems')}</p>}
      </section>
      <Button variant="primary" size="lg" className="w-full" onClick={() => void copy(plain)}>{t('copySummary')}</Button>
      <Button variant="secondary" className="w-full" disabled={!hasTranscript} onClick={() => void copy(build('txt', true))}>{t('copySummaryTranscript')}</Button>
      <div aria-live="polite">
        {message === 'copied' && <p role="status" className="text-sm">{t('copied')}</p>}
        {message === 'failed' && <Alert variant="danger" layout="inline">{t('copyFailed')}</Alert>}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <button type="button" className={linkClass} onClick={() => download('markdown', build('md'))}>{t('downloadDoc')}</button>
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
            <button type="button" className={linkClass} aria-label={`${t('copy')}: ${t('markdown')}`} onClick={() => void copy(build('md'))}>{t('copy')}</button>
            <button type="button" className={linkClass} aria-label={`${t('download')}: ${t('markdown')}`} onClick={() => download('markdown', build('md'))}>{t('download')}</button>
          </li>
        </ul>
      </details>
    </VStack>}
  </Modal>;
}
