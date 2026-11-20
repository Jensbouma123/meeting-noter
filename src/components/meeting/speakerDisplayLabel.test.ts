import { describe, expect, it } from 'vitest';
import { speakerDisplayLabel } from './speakerDisplayLabel';

describe('speakerDisplayLabel', () => {
  it('shows a numbered default label in the UI language', () => {
    expect(speakerDisplayLabel('Speaker 2', 'Spreker {n}')).toBe('Spreker 2');
    expect(speakerDisplayLabel('spreker 3', 'Speaker {n}')).toBe('Speaker 3');
    expect(speakerDisplayLabel(' Speaker 12 ', 'Spreker {n}')).toBe('Spreker 12');
  });

  it('leaves a typed name alone, even one that starts with "Speaker"', () => {
    expect(speakerDisplayLabel('Jan', 'Spreker {n}')).toBe('Jan');
    expect(speakerDisplayLabel('Speaker Anna', 'Spreker {n}')).toBe('Speaker Anna');
    expect(speakerDisplayLabel('Speaker 2b', 'Spreker {n}')).toBe('Speaker 2b');
  });
});
