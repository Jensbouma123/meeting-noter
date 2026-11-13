import { Button } from '@jensbouma123/acciva-ui';
import { useT } from '@/lib/i18n/useT';
import type { OnboardingFooterProps } from './types';

export function OnboardingFooter({ step, isLast, onSkip, onBack, onNext }: OnboardingFooterProps) {
  const t = useT('onboarding');
  const size = { base: 'md', md: 'sm' } as const;
  return (
    <div className="dialog-actions flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
      {isLast ? (
        <span />
      ) : (
        <Button variant="ghost" size={size} onClick={onSkip}>
          {t('skip')}
        </Button>
      )}
      <div className="dialog-actions flex flex-col-reverse gap-2 sm:flex-row">
        {step > 1 && !isLast && (
          <Button variant="outline" size={size} onClick={onBack}>
            {t('back')}
          </Button>
        )}
        <Button variant="primary" size={size} onClick={isLast ? onSkip : onNext} className="w-full sm:w-auto">
          {isLast ? t('finish') : t('next')}
        </Button>
      </div>
    </div>
  );
}
