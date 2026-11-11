'use client';

import { Alert, Button, Modal, VStack } from '@jensbouma123/acciva-ui';
import { useState } from 'react';
import { useT } from '@/lib/i18n/useT';
import { buildSummary } from '@/lib/meeting/summary';
import type { ActionItem, Decision } from '@/lib/meeting/notes';
import { copyToClipboard, downloadFile, exportFilename, formatExport, formatMeta, finalSegments, type ExportFormat } from '@/lib/meeting/export';
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
  const [expanded, setExpanded] = useState(false);
  const [message, setMessage] = useState<'copied' | 'failed' | null>(null);
  const transcript = finalSegments(segments);
  const hasTranscript = transcript.length > 0;
  const summary = buildSummary({ title, date, durationS, participants, decisions, actions, ...(hasTranscript ? { transcript: formatExport('txt', transcript, speakers, title) } : {}), format: 'md', t: summaryT });
  const copy = async (text: string) => setMessage(await copyToClipboard(text) ? 'copied' : 'failed');
  const download = (format: ExportFormat, text: string) => {
    const meta = formatMeta(format);
    downloadFile(exportFilename(title, meta.extension), text, meta.mime);
  };
  const transcriptText = (format: ExportFormat) => formatExport(format, transcript, speakers, title);

  return <Modal open={open} onClose={onClose} title={t('title')} size="sm" footer={<Button variant="ghost" onClick={onClose}>{t('close')}</Button>}>
    <VStack spacing="sm" className="w-full">
      <Button variant="primary" className="w-full" onClick={() => void copy(summary)}>{t('copySummary')}</Button>
      <Button variant="secondary" className="w-full" onClick={() => download('markdown', summary)}>{t('downloadMd')}</Button>
      {!hasTranscript && <p className="text-sm text-muted-foreground">{t('noTranscript')}</p>}
      <Button variant="secondary" className="w-full" disabled={!hasTranscript} onClick={() => setExpanded((value) => !value)}>{t('moreFormats')}</Button>
      {expanded && <div className="flex w-full flex-col gap-2" aria-label={t('moreFormats')}>
        {(['txt', 'srt'] as const).map((format) => <div key={format} className="flex gap-2">
          <Button variant="secondary" disabled={!hasTranscript} onClick={() => void copy(transcriptText(format))}>{format === 'txt' ? t('copyTxt') : t('copySrt')}</Button>
          <Button variant="secondary" disabled={!hasTranscript} onClick={() => download(format, transcriptText(format))}>{format === 'txt' ? t('downloadTxt') : t('downloadSrt')}</Button>
        </div>)}
      </div>}
      {message === 'copied' && <p role="status" className="text-sm">{t('copied')}</p>}
      {message === 'failed' && <Alert variant="danger" layout="inline">{t('copyFailed')}</Alert>}
    </VStack>
  </Modal>;
}
