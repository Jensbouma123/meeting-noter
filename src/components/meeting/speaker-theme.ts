import type { SpeakerColorStyle } from './speaker-theme.types';

export const SPEAKER_COLORS: SpeakerColorStyle[] = [
  {
    dotClass: 'bg-primary-500',
    textClass: 'text-primary-700 dark:text-primary-300',
    barBgClass: 'bg-primary-500',
    name: 'Primary Green',
  },
  {
    dotClass: 'bg-secondary-500',
    textClass: 'text-secondary-700 dark:text-secondary-300',
    barBgClass: 'bg-secondary-500',
    name: 'Teal',
  },
  {
    dotClass: 'bg-accent-500',
    textClass: 'text-accent-700 dark:text-accent-300',
    barBgClass: 'bg-accent-500',
    name: 'Berry',
  },
  {
    dotClass: 'bg-info-500',
    textClass: 'text-info-700 dark:text-info-300',
    barBgClass: 'bg-info-500',
    name: 'Blue',
  },
  {
    dotClass: 'bg-warning-500',
    textClass: 'text-warning-800 dark:text-warning-300',
    barBgClass: 'bg-warning-500',
    name: 'Amber',
  },
  {
    dotClass: 'bg-danger-500',
    textClass: 'text-danger-700 dark:text-danger-300',
    barBgClass: 'bg-danger-500',
    name: 'Rose',
  },
  {
    dotClass: 'bg-success-500',
    textClass: 'text-success-800 dark:text-success-300',
    barBgClass: 'bg-success-500',
    name: 'Emerald',
  },
  {
    dotClass: 'bg-neutral-500',
    textClass: 'text-neutral-700 dark:text-neutral-300',
    barBgClass: 'bg-neutral-500',
    name: 'Slate',
  },
];

function wrapSpeakerColorIndex(index: number, count: number): number {
  return Number.isFinite(index) ? ((Math.trunc(index) % count) + count) % count : 0;
}

export function getSpeakerColor(index: number): SpeakerColorStyle {
  return SPEAKER_COLORS[wrapSpeakerColorIndex(index, SPEAKER_COLORS.length)];
}
