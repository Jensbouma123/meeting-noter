import { Button } from '@jensbouma123/acciva-ui';
import { ChevronDown, Pencil, UserPlus } from 'lucide-react';
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
        <span
          ref={nameRef}
          title={nameTruncated ? label : undefined}
          className="min-w-0 flex-1 truncate text-left text-sm font-medium text-foreground"
        >
          {label}
        </span>
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
      trailingIcon={
        <Pencil
          data-speaker-edit=""
          className={`size-3 text-muted-foreground transition-opacity ${
            unnamed ? 'opacity-70' : 'opacity-0 group-hover/assign:opacity-70 group-focus-visible/assign:opacity-70'
          }`}
          aria-hidden="true"
        />
      }
      className={`group/assign -ml-1.5 min-w-0 max-w-full justify-start px-1.5 ${className ?? ''}`}
    >
      <span
        ref={nameRef}
        data-speaker-name=""
        title={nameTruncated ? label : undefined}
        className={`min-w-0 truncate text-left ${textClassName ?? ''}`}
      >
        {label}
      </span>
    </Button>
  );
}
