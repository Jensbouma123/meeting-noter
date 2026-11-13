import { useEffect, useRef } from 'react';
import { useToast } from '@jensbouma123/acciva-ui';
import { useT } from '@/lib/i18n/useT';
import type { ModelReadiness } from '../types';

interface MeetingToastsParams {
  error: string | null;
  warning: string | null;
  modelPreparing: boolean;
  modelReadiness: ModelReadiness;
  asrProblem: string | null;
}

export function useMeetingToasts({ error, warning, modelPreparing, modelReadiness, asrProblem }: MeetingToastsParams) {
  const t = useT('meeting');
  const { toast } = useToast();
  const wasPreparingRef = useRef(false);

  useEffect(() => {
    if (error) toast.danger(error, { title: t('recordingError') });
  }, [error, toast, t]);

  useEffect(() => {
    if (warning) toast.warning(warning);
  }, [warning, toast]);

  useEffect(() => {
    if (modelPreparing) {
      wasPreparingRef.current = true;
      return;
    }
    if (!wasPreparingRef.current || modelReadiness !== 'ready') return;
    wasPreparingRef.current = false;
    if (asrProblem) return;
    toast.success(t('modelReadyTitle'), { description: t('modelReadyBody') });
  }, [modelPreparing, modelReadiness, asrProblem, toast, t]);
}
