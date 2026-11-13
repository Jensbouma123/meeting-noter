import { useRef } from 'react';
import { useToast } from '@jensbouma123/acciva-ui';
import { useT } from '@/lib/i18n/useT';
import { useOnChange } from '@/hooks/useOnChange';
import type { MeetingToastsParams } from '../types';

export function useMeetingToasts({ error, warning, modelPreparing, modelReadiness, asrProblem }: MeetingToastsParams) {
  const t = useT('meeting');
  const { toast } = useToast();
  const wasPreparingRef = useRef(false);

  useOnChange(error, (message) => {
    if (message) toast.danger(message, { title: t('recordingError') });
  });

  useOnChange(warning, (message) => {
    if (message) toast.warning(message);
  });

  useOnChange(`${modelPreparing}|${modelReadiness}|${Boolean(asrProblem)}`, () => {
    if (modelPreparing) {
      wasPreparingRef.current = true;
      return;
    }
    if (!wasPreparingRef.current || modelReadiness !== 'ready') return;
    wasPreparingRef.current = false;
    if (asrProblem) return;
    toast.success(t('modelReadyTitle'), { description: t('modelReadyBody') });
  });
}
