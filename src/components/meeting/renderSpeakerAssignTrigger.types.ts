import type { RefObject } from 'react';

export interface SpeakerAssignTriggerProps {
  t: (key: string) => string;
  rail: boolean;
  unnamed: boolean;
  label: string;
  className?: string;
  textClassName?: string;
  nameRef: RefObject<HTMLSpanElement | null>;
  nameTruncated: boolean;
}
