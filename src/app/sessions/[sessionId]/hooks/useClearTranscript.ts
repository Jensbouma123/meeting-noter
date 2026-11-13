import { useCallback } from 'react';
import { useToast } from '@jensbouma123/acciva-ui';
import { useT } from '@/lib/i18n/useT';
import { clearSessionTranscript } from '@/lib/meeting/session-store';

export function useClearTranscript(initialSessionId?: string) {
  const t = useT('meeting');
  const { toast } = useToast();
  return useCallback(() => {
    if (!initialSessionId) return;
    if (clearSessionTranscript(initialSessionId)) toast({ title: t('transcriptCleared'), variant: 'success' });
    else toast({ title: t('stopFirst'), variant: 'warning' });
  }, [initialSessionId, toast, t]);
}
