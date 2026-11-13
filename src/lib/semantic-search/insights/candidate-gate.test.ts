import { describe, expect, it } from 'vitest';
import labeled from '../../../../tests/fixtures/insights/labeled-sentences.json';
import { candidateKinds } from './candidate-gate';
import { detectLanguage } from './language';

const SCREENSHOT_NOISE = [
  'Und zwar können entsprechend.',
  'Dat is gewoon één.',
  'Yes, I feel like',
  'I think we have a float look.',
  'En dat is dus het fijne waarom dit zo snel gaat.',
  'Zoals hier zie je dat wij ook dus tegelijk praten.',
  'Dan moet ik het aan elkaar tieven.',
  'En daar En dat is uitdaging waar we naar zoeken.',
];

describe('candidateKinds', () => {
  it('rejects every noise line from meeting 8fdc9a6d', () => {
    for (const text of SCREENSHOT_NOISE) expect(candidateKinds(text), text).toEqual([]);
  });

  it('lets every labeled NL/EN positive through with its own kind', () => {
    for (const { kind, text } of labeled.positive) expect(candidateKinds(text), text).toContain(kind);
  });

  it('rejects questions, fragments, short lines, negations, hedges and other languages', () => {
    for (const text of [
      'Gaan we dit nou echt allemaal voor vrijdag doen?',
      'we gaan voor de lunch denk ik',
      'Ik ga echt niet elke review doen hoor.',
      'Ik weet niet of we dat voor maandag halen hoor.',
      "We'll see, it is up to you really.",
      'Ik stuur het door.',
      'Ich werde das morgen erledigen, versprochen.',
      'Je vais envoyer le document demain matin.',
      'I will send the updated slides to the team...',
    ]) expect(candidateKinds(text), text).toEqual([]);
  });
});

describe('detectLanguage', () => {
  it('tells Dutch, English and other languages apart', () => {
    expect(detectLanguage('Ik stuur de offerte morgen naar de klant.')).toBe('nl');
    expect(detectLanguage('I will send the slides to the team.')).toBe('en');
    expect(detectLanguage('Und zwar können entsprechend.')).toBeNull();
  });
});
