import { Button } from '@jensbouma123/acciva-ui';
import { ChevronDown, UserPlus } from 'lucide-react';
import type { SpeakerAssignTriggerProps } from './renderSpeakerAssignTrigger.types';

export function renderSpeakerAssignTrigger({
  t,
  rail,
  unnamed,
  label,
  className,
  textClassName,
  nameRef,
  nameTruncated,
}: SpeakerAssignTriggerProps) {
  if (rail && unnamed) {
    return (
      <Button
        type="button"
        variant="outline"
        size="xs"
        data-testid="speaker-assign"
        aria-label={`${t('whoIsThis')} (${label})`}
        leadingIcon={<UserPlus className="size-3.5" aria-hidden="true" />}
        trailingIcon={<ChevronDown className="size-3 opacity-60" aria-hidden="true" />}
        className="text-foreground"
      >
        {t('whoIsThis')}
      </Button>
    );
  }
  if (rail) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="xs"
        data-testid="speaker-assign"
        aria-label={`${t('change')}: ${label}`}
        trailingIcon={<ChevronDown className="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />}
        className="-ml-1.5 min-w-0 w-full max-w-none flex-1 justify-start px-1.5"
      >
        <span ref={nameRef} title={nameTruncated ? label : undefined} className="min-w-0 flex-1 truncate text-left text-sm font-medium text-foreground">{label}</span>
      </Button>
    );
  }
  return (
    <Button
      type="button"
      variant="ghost"
      size="xs"
      data-testid="speaker-assign"
      aria-label={unnamed ? `${t('whoIsThis')} (${label})` : `${t('change')}: ${label}`}
      trailingIcon={<ChevronDown className="size-3 opacity-60" aria-hidden="true" />}
      className={className}
    >
      <span className={`truncate ${textClassName ?? ''}`}>{unnamed ? t('whoIsThis') : label}</span>
    </Button>
  );
}
